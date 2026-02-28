// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAICCsFbmw8JY2rmd-SsrAUCjiQVWGe-l8",
  authDomain: "forptetest-717ce.firebaseapp.com",
  projectId: "forptetest-717ce",
  storageBucket: "forptetest-717ce.firebasestorage.app",
  messagingSenderId: "274608207568",
  appId: "1:274608207568:web:49cc220d43f782ed1c50d5",
  measurementId: "G-9XYV25XLFZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };