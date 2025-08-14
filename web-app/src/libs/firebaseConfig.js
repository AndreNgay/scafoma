// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDPynKi0mWNJ0R5TFLYL74gJg0S13hMHlE",
  authDomain: "scafoma.firebaseapp.com",
  projectId: "scafoma",
  storageBucket: "scafoma.firebasestorage.app",
  messagingSenderId: "376061587163",
  appId: "1:376061587163:web:35636466a3d7327d1fe6fe",
  measurementId: "G-86F6W03YST"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };