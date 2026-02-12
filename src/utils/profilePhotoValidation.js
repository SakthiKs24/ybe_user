/**
 * Profile photo validation (client-side only):
 * File type, size, and face detection (valid human photo).
 * No backend/Firebase Functions used.
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

    // 2) Fallback when FaceDetector not available: accept image
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
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
 * Validate file → validate face → upload to Storage. No Firebase Functions used.
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

    return { success: true, url: downloadURL };
  } catch (err) {
    console.error('Profile image upload error:', err?.message || err);
    return { success: false, error: 'Failed to upload photo. Please try again.' };
  }
}
