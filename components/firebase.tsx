// components/firebase.ts
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCjhPd01r11xqHVJeQDgH2Di2dlAfk5Ifo",
  authDomain: "commentandlogin-a7482.firebaseapp.com",
  projectId: "commentandlogin-a7482",
  storageBucket: "commentandlogin-a7482.appspot.com",
  messagingSenderId: "1035365924254",
  appId: "1:1035365924254:web:ee578f90e6159e83cdea8f"
};

const commentApp = getApps().some(app => app.name === "commentApp")
  ? getApp("commentApp")
  : initializeApp(firebaseConfig, "commentApp");

export const db = getFirestore(commentApp);
