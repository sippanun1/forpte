// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA4j7xOjlETzQEm_vgVd6aSSivM6pQaKUQ",
  authDomain: "pteinfo-4dbee.firebaseapp.com",
  projectId: "pteinfo-4dbee",
  storageBucket: "pteinfo-4dbee.firebasestorage.app",
  messagingSenderId: "735786006354",
  appId: "1:735786006354:web:8fd2892a1f47f2510f6c8b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };