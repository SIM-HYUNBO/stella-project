// app/firebase.ts
"use client";

import { initializeApp, getApps, getApp } from "firebase/app"; // ✅ 여기서 getApps, getApp을 함께 import
import { getAuth } from "firebase/auth";

/* 🔹 로그인용 Firebase 설정 */
const firebaseConfig = {
  apiKey: "AIzaSyCjhPd01r11xqHVJeQDgH2Di2dlAfk5Ifo",
  authDomain: "commentandlogin-a7482.firebaseapp.com",
  projectId: "commentandlogin-a7482",
  storageBucket: "commentandlogin-a7482.firebasestorage.app",
  messagingSenderId: "1035365924254",
  appId: "1:1035365924254:web:ee578f90e6159e83cdea8f"
};
/* 🔸 중복 초기화 방지 */
const loginApp = getApps().some(app => app.name === "loginApp")
  ? getApp("loginApp")
  : initializeApp(firebaseConfig, "loginApp");

/* ✅ Auth export */
export const auth = getAuth(loginApp);
export default loginApp;
