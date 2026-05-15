import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getStorage } from "firebase/storage";

import {
  getMessaging,
  isSupported,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBBSM0axgA9iVrTpqpF31dmBSARajf6Xic",
  authDomain: "wagchat-e17ae.firebaseapp.com",
  projectId: "wagchat-e17ae",
  storageBucket: "wagchat-e17ae.firebasestorage.app",
  messagingSenderId: "321656715514",
  appId: "1:321656715514:web:4eda4a7375b846a939b143",
  databaseURL: "https://wagchat-e17ae-default-rtdb.firebaseio.com",
};

// 앱 초기화
const app =
  getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Realtime Database
export const rtdb = getDatabase(app);

// Auth
export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch(() => {});

// Storage
export const storage = getStorage(app);

// FCM Messaging
export const getFirebaseMessaging = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  const supported = await isSupported();

  if (!supported) {
    return null;
  }

  return getMessaging(app);
};

export default app;