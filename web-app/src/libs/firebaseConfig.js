import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDPynKi0mWNJ0R5TFLYL74gJg0S13hMHlE",
  authDomain: "scafoma.firebaseapp.com",
  projectId: "scafoma",
  storageBucket: "scafoma.firebasestorage.app",
  messagingSenderId: "376061587163",
  appId: "1:376061587163:web:35636466a3d7327d1fe6fe",
  measurementId: "G-86F6W03YST"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth, firebaseConfig }; 
