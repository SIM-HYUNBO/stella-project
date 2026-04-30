// app/hooks/usePushSubscription.ts
"use client";

import { useEffect } from "react";
import { db } from "@/app/firebase";
import { doc, setDoc } from "firebase/firestore";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription(nickname: string | null) {
  useEffect(() => {
    if (!nickname || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const register = async () => {
      try {
        // 서비스 워커 등록
        const reg = await navigator.serviceWorker.register("/sw.js");

        // 알림 권한 요청
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // 기존 구독 확인 또는 새로 구독
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        // Firestore에 구독 정보 저장 (nickname 기준)
        await setDoc(
          doc(db, "push_subscriptions", nickname),
          { subscription: JSON.stringify(sub), updatedAt: new Date() },
          { merge: true }
        );
      } catch (e) {
        console.error("푸시 구독 오류:", e);
      }
    };

    register();
  }, [nickname]);
}