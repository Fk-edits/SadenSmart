import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDDceDGKyu8tyZ_ZLPefkL3ElzVNHfQmN4",
  authDomain: "sass-school-ea659.firebaseapp.com",
  projectId: "sass-school-ea659",
  storageBucket: "sass-school-ea659.firebasestorage.app",
  messagingSenderId: "941464239698",
  appId: "1:941464239698:web:ea1fb74408bca4fc95698b",
  measurementId: "G-VPKNRKCHTR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);