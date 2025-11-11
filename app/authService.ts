// src/app/authService.ts
"use client";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase"; // 경로 꼭 확인

export const watchAuthState = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};
