"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCjhPd01r11xqHVJeQDgH2Di2dlAfk5Ifo",
  authDomain: "commentandlogin-a7482.firebaseapp.com",
  projectId: "commentandlogin-a7482",
  storageBucket: "commentandlogin-a7482.appspot.com",
  messagingSenderId: "1035365924254",
  appId: "1:1035365924254:web:ee578f90e6159e83cdea8f",
};

// ✅ Firebase 앱이 이미 초기화되어 있는지 체크
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// 서비스 가져오기
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);
const messaging = getMessaging(firebaseApp); // FCM용

export { firebaseApp, db, auth, storage, messaging };
