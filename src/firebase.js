import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAS9lJsOMRb6m1lZsfSXjE4049vpDbnMtw",
  authDomain: "expense-tracker-e510d.firebaseapp.com",
  projectId: "expense-tracker-e510d",
  storageBucket: "expense-tracker-e510d.firebasestorage.app",
  messagingSenderId: "333032702838",
  appId: "1:333032702838:web:533cfc689627e73f8af057"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);