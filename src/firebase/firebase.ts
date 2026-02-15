// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEh8JwbD3ps_t1vKXW_GCPlw8lLpYoXL8",
  authDomain: "pte1-e0c11.firebaseapp.com",
  projectId: "pte1-e0c11",
  storageBucket: "pte1-e0c11.firebasestorage.app",
  messagingSenderId: "873556887728",
  appId: "1:873556887728:web:e3e5478f06485a2999d375"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };