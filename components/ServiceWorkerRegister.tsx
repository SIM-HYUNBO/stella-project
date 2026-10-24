"use client";
import { useEffect } from "react";
import { isAndroidApp } from "@/lib/native-push";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (isAndroidApp()) return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
