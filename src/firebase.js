import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBv3IO-HFleF4Y2LwmqoqC540gtTaj9CUg",
    authDomain: "positive-apex-478217-a5.firebaseapp.com",
    projectId: "positive-apex-478217-a5",
    storageBucket: "positive-apex-478217-a5.firebasestorage.app",
    messagingSenderId: "816722228404",
    appId: "1:816722228404:web:050b7b950db7d12a8a53e1",
    measurementId: "G-F4LPR23Y3Z"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
