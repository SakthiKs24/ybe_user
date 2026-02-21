import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as faceapi from '@vladmandic/face-api';

const storage = getStorage();
let modelsLoaded = false;


const loadModels = async () => {
  if (modelsLoaded) return;

  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
};


const fileToImage = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
};


const basicFileValidation = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, or WebP images are allowed.' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'Image size must be less than 10MB.' };
  }
  return { valid: true };
};


const uploadToFirebase = async (file, userId) => {
  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageRef = ref(storage, `profile_images/${userId}/${userId}_${timestamp}_${safeFileName}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

/**
 *
 * @param {File} file
 * @param {string} userId - Firestore document ID
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadProfileImageWithValidation = async (file, userId) => {
  try {
    // Step 1: Basic validation
    const basicCheck = basicFileValidation(file);
    if (!basicCheck.valid) {
      return { success: false, error: basicCheck.error };
    }

    // Step 2: Load face detection models
    await loadModels();

    // Step 3: Convert file to image element
    const img = await fileToImage(file);

    // Step 4: Detect faces
    const detections = await faceapi
      .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.4  
      }))
      .withFaceLandmarks(true);

    const faceCount = detections.length;

    if (faceCount === 0) {
      return {
        success: false,
        error: 'No human face detected. Please upload a clear photo showing your face.'
      };
    }

    if (faceCount > 1) {
      return {
        success: false,
        error: `${faceCount} faces found. Please upload a solo photo with only your face.`
      };
    }

    const downloadURL = await uploadToFirebase(file, userId);
    return { success: true, url: downloadURL };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: 'Failed to process image. Please try again.'
    };
  }
};