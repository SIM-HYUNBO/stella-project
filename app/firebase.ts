import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  apiKey: "AIzaSyBBSM0axgA9iVrTpqpF31dmBSARajf6Xic",
  authDomain: "wagchat-e17ae.firebaseapp.com",
  projectId: "wagchat-e17ae",
  storageBucket: "wagchat-e17ae.firebasestorage.app",
  messagingSenderId: "321656715514",
  appId: "1:321656715514:web:4eda4a7375b846a939b143",
  // 🚨 아래 줄이 없어서 에러가 났던 겁니다! 
  databaseURL: "https://wagchat-e17ae-default-rtdb.firebaseio.com" 
};

// 앱 초기화
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 데이터베이스 인스턴스 export
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
