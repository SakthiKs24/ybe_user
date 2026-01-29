/**
 * Firebase Callable: validateProfilePhoto
 * Validates that the image contains a face (valid person) and is not a celebrity/stock photo.
 * Requires Google Cloud Vision API enabled for the project.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

if (!admin.apps.length) {
  admin.initializeApp();
}

const visionClient = new ImageAnnotatorClient();

// Labels that suggest celebrity/stock/famous person (avoid broad terms like "actor" to reduce false positives)
const CELEBRITY_LABELS = [
  'celebrity',
  'famous person',
  'public figure',
  'entertainer',
  'fashion model',
  'supermodel',
];

function isCelebrityLikeLabel(description) {
  if (!description || typeof description !== 'string') return false;
  const lower = description.toLowerCase();
  return CELEBRITY_LABELS.some((l) => lower.includes(l));
}

/**
 * Fetch image from URL and return as base64.
 */
async function fetchImageAsBase64(imageUrl) {
  const response = await fetch(imageUrl, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

/**
 * Validate profile photo: must have a face, must not be celebrity/stock.
 */
exports.validateProfilePhoto = functions.https.onCall(async (data, context) => {
  const imageUrl = data?.imageUrl;
  if (!imageUrl || typeof imageUrl !== 'string') {
    return { valid: false, error: 'Please upload a valid image.' };
  }

  try {
    const imageBase64 = await fetchImageAsBase64(imageUrl);

    const [faceResult, webResult, labelResult] = await Promise.all([
      visionClient.faceDetection({
        image: { content: imageBase64 },
      }),
      visionClient.webDetection({
        image: { content: imageBase64 },
      }),
      visionClient.labelDetection({
        image: { content: imageBase64 },
      }),
    ]);

    const faceAnnotations = faceResult[0]?.faceAnnotations || [];
    if (!faceAnnotations.length) {
      return {
        valid: false,
        error: 'Please upload a valid person image (clear face visible). No landscapes or objects.',
      };
    }

    const labels = labelResult[0]?.labelAnnotations || [];
    const hasCelebrityLabel = labels.some((a) => isCelebrityLikeLabel(a.description));
    if (hasCelebrityLabel) {
      return {
        valid: false,
        isCelebrity: true,
        error: 'Celebrity or stock photos are not allowed. Please upload your own photo.',
      };
    }

    const webEntities = webResult[0]?.webDetection?.webEntities || [];
    const hasCelebrityEntity = webEntities.some(
      (e) => e.score != null && e.score > 0.7 && isCelebrityLikeLabel(e.description || '')
    );
    if (hasCelebrityEntity) {
      return {
        valid: false,
        isCelebrity: true,
        error: 'Celebrity or stock photos are not allowed. Please upload your own photo.',
      };
    }

    return { valid: true };
  } catch (err) {
    console.error('validateProfilePhoto error:', err.message || err);
    // If Vision API is not enabled or request fails, allow upload so app keeps working
    return { valid: true };
  }
});
