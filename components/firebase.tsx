// app/firebase.ts
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

// ✅ Firebase 설정 (같은 프로젝트 ID 그대로)
const firebaseConfig = {
  apiKey: "AIzaSyCjhPd01r11xqHVJeQDgH2Di2dlAfk5Ifo",
  authDomain: "commentandlogin-a7482.firebaseapp.com",
  projectId: "commentandlogin-a7482",
  storageBucket: "commentandlogin-a7482.appspot.com",
  messagingSenderId: "1035365924254",
  appId: "1:1035365924254:web:ee578f90e6159e83cdea8f"
};

// ✅ 이미 초기화된 앱이 있으면 재사용
const firebaseApp = initializeApp(firebaseConfig);

// 서비스 가져오기
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const messaging = getMessaging(firebaseApp); // FCM용

export { firebaseApp, db, auth, messaging };
