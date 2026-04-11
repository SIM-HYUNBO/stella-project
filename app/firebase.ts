// /app/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
   apiKey: "AIzaSyBBSM0axgA9iVrTpqpF31dmBSARajf6Xic",
  authDomain: "wagchat-e17ae.firebaseapp.com",
  projectId: "wagchat-e17ae",
  storageBucket: "wagchat-e17ae.firebasestorage.app",
  messagingSenderId: "321656715514",
  appId: "1:321656715514:web:4eda4a7375b846a939b143"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
// FCM (웹 지원 체크)
export const messagingPromise = isSupported().then((supported) =>
  supported ? getMessaging(app) : null
);