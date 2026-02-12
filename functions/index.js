/**
 * Firebase Callable: validateProfilePhoto
 * Uses AWS Rekognition: DetectFaces (valid human face) + RecognizeCelebrities.
 *
 * AWS credentials (deployed function does NOT read your project .env file):
 * - Local/emulator: copy .env into functions/.env or use root .env
 * - Deployed: REQUIRED - run:
 *     firebase functions:config:set aws.access_key_id="YOUR_KEY" aws.secret_access_key="YOUR_SECRET"
 *   then: firebase deploy --only functions
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {
  RekognitionClient,
  DetectFacesCommand,
  RecognizeCelebritiesCommand,
} = require('@aws-sdk/client-rekognition');

if (!admin.apps.length) {
  admin.initializeApp();
}

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';

function getAwsCredentials() {
  try {
    const cfg = functions.config();
    const accessKey =
      process.env.AWS_ACCESS_KEY_ID ||
      (cfg.aws && (cfg.aws.access_key_id || cfg.aws.accessKeyId));
    const secretKey =
      process.env.AWS_SECRET_ACCESS_KEY ||
      (cfg.aws && (cfg.aws.secret_access_key || cfg.aws.secretAccessKey));
    return { accessKey: accessKey || null, secretKey: secretKey || null };
  } catch (e) {
    return { accessKey: null, secretKey: null };
  }
}

/**
 * Parse Firebase Storage download URL to get bucket name and file path.
 * Format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/ENCODED_PATH?alt=media&token=...
 */
function parseStorageUrl(imageUrl) {
  try {
    const url = new URL(imageUrl);
    if (!url.pathname.includes('/b/') || !url.pathname.includes('/o/')) return null;
    const match = url.pathname.match(/\/b\/([^/]+)\/o\/(.+)$/);
    if (!match) return null;
    const bucket = match[1];
    const encodedPath = match[2];
    const filePath = decodeURIComponent(encodedPath);
    return { bucket, filePath };
  } catch (e) {
    return null;
  }
}

/**
 * Get image bytes: try Firebase Admin Storage first (works with private files), then fetch.
 */
async function getImageBytes(imageUrl) {
  const parsed = parseStorageUrl(imageUrl);
  if (parsed) {
    try {
      const bucket = admin.storage().bucket(parsed.bucket);
      const [buffer] = await bucket.file(parsed.filePath).download();
      return buffer;
    } catch (e) {
      console.warn('Storage download failed, trying fetch:', e.message);
    }
  }
  const response = await fetch(imageUrl, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Validate profile photo: must have a face, must not be celebrity.
 */
exports.validateProfilePhoto = functions.https.onCall(async (data, context) => {
  const imageUrl = data?.imageUrl;
  if (!imageUrl || typeof imageUrl !== 'string') {
    return { valid: false, error: 'Please upload a valid image.' };
  }

  const { accessKey, secretKey } = getAwsCredentials();
  if (!accessKey || !secretKey) {
    console.warn(
      'AWS credentials missing in deployed function. Run: firebase functions:config:set aws.access_key_id="..." aws.secret_access_key="..." then redeploy.'
    );
    return {
      valid: false,
      error:
        'Photo validation is not configured. Please contact support or try again later.',
    };
  }

  try {
    const imageBytes = await getImageBytes(imageUrl);

    if (!imageBytes || imageBytes.length === 0) {
      return { valid: false, error: 'Image file is empty or invalid.' };
    }

    const maxSize = 15 * 1024 * 1024;
    if (imageBytes.length > maxSize) {
      return {
        valid: false,
        error: 'Image size exceeds limit (15MB). Please use a smaller image.',
      };
    }

    const client = new RekognitionClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });

    const imagePayload = { Bytes: imageBytes };

    const detectFacesResult = await client.send(
      new DetectFacesCommand({
        Image: imagePayload,
        Attributes: ['DEFAULT'],
      })
    );

    const faceDetails = detectFacesResult.FaceDetails || [];
    if (faceDetails.length === 0) {
      return {
        valid: false,
        error:
          'Please upload a valid person image (clear face visible). No landscapes, objects, or unclear photos.',
      };
    }

    const celebResult = await client.send(
      new RecognizeCelebritiesCommand({ Image: imagePayload })
    );

    const celebrityFaces = celebResult.CelebrityFaces || [];
    if (celebrityFaces.length > 0) {
      const first = celebrityFaces[0];
      const name = first.Name || 'Unknown';
      const confidence = first.MatchConfidence != null ? first.MatchConfidence : 0;
      console.log(`Celebrity detected: ${name} (${confidence.toFixed(1)}%)`);
      return {
        valid: false,
        isCelebrity: true,
        error:
          'Celebrity or stock photos are not allowed. Please upload your own photo.',
      };
    }

    return { valid: true };
  } catch (err) {
    console.error('validateProfilePhoto error:', err.message, err.code || '');
    return {
      valid: false,
      error:
        err.message && err.message.includes('fetch')
          ? 'Could not process the image. Please try again.'
          : 'Photo validation failed. Please try again.',
    };
  }
});
