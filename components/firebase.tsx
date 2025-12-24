import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCZpx2J53C-gA5AOfZGJlEiPV59ktB1KBE",
  authDomain: "commentbox-f0b9d.firebaseapp.com",
  projectId: "commentbox-f0b9d",
  storageBucket: "commentbox-f0b9d.firebasestorage.app",
  messagingSenderId: "815767964448",
  appId: "1:815767964448:web:bf30016e89a83401c22545",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

console.log("🔥 실제 연결된 Firebase projectId:", app.options.projectId);

export const auth = getAuth(app);
export const db = getFirestore(app);
export { app };
