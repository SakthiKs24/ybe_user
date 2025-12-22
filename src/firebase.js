// src/firebase.js
import { initializeApp } from 'firebase/app';
import  { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Import the storage module

const firebaseConfig = {
  apiKey: "AIzaSyAmHEMUlgxpwuTOAwRpFgiilMR_DiDzs1w",
  authDomain: "ybedatingapp.firebaseapp.com",
  databaseURL: "https://ybedatingapp-default-rtdb.firebaseio.com",
  projectId: "ybedatingapp",
  storageBucket: "ybedatingapp.appspot.com",
  messagingSenderId: "230716451658",
  appId: "1:230716451658:web:cc6e3c4628ed612651afb3",
  measurementId: "G-3G0WMP6MNR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // Initialize storage

export { auth, signOut, db, addDoc, collection, storage };
