"use client";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

export const watchAuthState = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};
