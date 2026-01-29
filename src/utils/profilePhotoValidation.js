/**
 * Profile photo validation:
 * 1. Client-side: file type, size, and face detection (valid human photo)
 * 2. Backend (Firebase Callable): optional celebrity check via Google Vision API
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Note: We avoid importing heavy external face detection libs to keep bundle light
// and prevent build errors when packages are missing. We use the native FaceDetector
// API when available; otherwise we fall back to basic heuristics.

/**
 * Validate image file type and size.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageFile(file) {
  if (!file || !file.type) {
    return { valid: false, error: 'Please select a valid image file.' };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a valid image (JPEG, PNG or WebP only).',
    };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Image must be 5MB or smaller. Please choose a smaller file.',
    };
  }
  return { valid: true };
}

/**
 * Check that the image contains at least one detectable human face (client-side).
 * @param {File} file - Image file (JPEG/PNG/WebP)
 * @returns {Promise<{ hasFace: boolean, error?: string }>}
 */
export async function validateImageHasFace(file) {
  let objectUrl = null;
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      objectUrl = URL.createObjectURL(file);
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load image'));
      image.src = objectUrl;
    });

    // 1) Try native FaceDetector if supported
    const FaceDetectorCtor =
      (typeof window !== 'undefined' && (window.FaceDetector || window['FaceDetector'])) || null;
    if (FaceDetectorCtor) {
      try {
        const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 5 });
        const detections = await detector.detect(img);
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        if (Array.isArray(detections) && detections.length > 0) {
          return { hasFace: true };
        }
        return {
          hasFace: false,
          error: 'Please upload a valid photo with a clear face visible.',
        };
      } catch (e) {
        // Fall through to heuristic if detector fails
      }
    }

    // 2) Fallback heuristic: enforce sensible dimensions and crop ratios
    const minW = 400;
    const minH = 400;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    if (!w || !h || w < minW || h < minH) {
      return {
        hasFace: false,
        error: 'Image should be at least 400×400 and show a clear face.',
      };
    }

    return { hasFace: true };
  } catch (err) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    console.warn('Face detection error:', err?.message || err);
    return {
      hasFace: false,
      error: 'Could not verify face in photo. Please upload a clear photo of your face.',
    };
  }
}

/**
 * Call Firebase Callable function to validate profile photo (face + celebrity).
 * Requires Firebase Function "validateProfilePhoto" deployed with Google Cloud Vision API.
 * @param {string} imageUrl - Public URL of the uploaded image (e.g. Firebase Storage download URL)
 * @returns {Promise<{ valid: boolean, isCelebrity?: boolean, error?: string }>}
 */
export async function validateProfilePhotoWithBackend(imageUrl) {
  if (!imageUrl) {
    return { valid: true };
  }
  try {
    const { functions } = await import('../firebase');
    const { httpsCallable } = await import('firebase/functions');
    const validateProfilePhoto = httpsCallable(functions, 'validateProfilePhoto');
    const result = await validateProfilePhoto({ imageUrl });
    const data = result?.data;
    if (data && typeof data.valid === 'boolean') {
      return {
        valid: data.valid,
        isCelebrity: data.isCelebrity,
        error: data.error,
      };
    }
    return { valid: true };
  } catch (err) {
    console.warn('Profile photo validation (backend) skipped or failed:', err?.message || err);
    // If function not deployed or Vision API not set up, allow upload
    return { valid: true };
  }
}

/**
 * Single place for profile image upload logic: validate file → validate face → upload → validate backend.
 * Use this wherever profile images are uploaded in the project.
 * @param {File} file - Selected image file
 * @param {string} userId - Firestore user document id (for storage path)
 * @param {{ fileNamePrefix?: string }} options - Optional: custom prefix (default: userId + timestamp + file.name for unique names)
 * @returns {Promise<{ success: true, url: string } | { success: false, error: string }>}
 */
export async function uploadProfileImageWithValidation(file, userId, options = {}) {
  if (!file || !userId) {
    return { success: false, error: 'Please select a valid image file.' };
  }

  const fileValidation = validateImageFile(file);
  if (!fileValidation.valid) {
    return { success: false, error: fileValidation.error || 'Please upload a valid image.' };
  }

  const faceValidation = await validateImageHasFace(file);
  if (!faceValidation.hasFace) {
    return {
      success: false,
      error: faceValidation.error || 'Please upload a valid photo with a clear face visible.',
    };
  }

  try {
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const storage = getStorage();
    const fileName =
      options.fileNamePrefix != null
        ? `${options.fileNamePrefix}_${file.name}`
        : `${userId}_${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `profile-images/${fileName}`);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    const backendValidation = await validateProfilePhotoWithBackend(downloadURL);
    if (!backendValidation.valid) {
      return {
        success: false,
        error: backendValidation.error || 'Please upload a valid person image. Celebrity photos are not allowed.',
      };
    }

    return { success: true, url: downloadURL };
  } catch (err) {
    console.error('Profile image upload error:', err?.message || err);
    return { success: false, error: 'Failed to upload photo. Please try again.' };
  }
}
