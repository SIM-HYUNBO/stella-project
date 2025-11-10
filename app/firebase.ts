// src/components/firebase.ts
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqtBgAtH4PIxQJLoSHTzdRpEh4_N8y4xI",
  authDomain: "login-70224.firebaseapp.com",
  projectId: "login-70224",
  storageBucket: "login-70224.appspot.com",
  messagingSenderId: "156916080839",
  appId: "1:156916080839:web:1200a85db1f99c8fd25ee2"
};

// ✅ Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// ✅ Auth + Firestore 초기화
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ 로그인 상태 유지
setPersistence(auth, browserLocalPersistence);
