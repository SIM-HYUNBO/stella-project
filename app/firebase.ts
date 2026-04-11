"use client";

import { initializeApp, getApps, getApp } from "firebase/app"; // ✅ getApp 추가
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


 const firebaseConfig = {
  apiKey: "AIzaSyBBSM0axgA9iVrTpqpF31dmBSARajf6Xic",
  authDomain: "wagchat-e17ae.firebaseapp.com",
  projectId: "wagchat-e17ae",
  storageBucket: "wagchat-e17ae.firebasestorage.app",
  messagingSenderId: "321656715514",
  appId: "1:321656715514:web:4eda4a7375b846a939b143"
};

// Firebase 앱 초기화 (중복 초기화 방지)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Auth, Firestore, Storage 내보내기
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
