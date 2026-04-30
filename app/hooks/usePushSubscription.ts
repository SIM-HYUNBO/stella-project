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
  // 서비스 워커만 미리 등록
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // 버튼 클릭 시 호출할 함수 반환
  const requestAndSubscribe = async () => {
    if (!nickname || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

    try {
      const reg = await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("알림을 허용해야 푸시 알림을 받을 수 있어요.");
        return;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      await setDoc(
        doc(db, "push_subscriptions", nickname),
        { subscription: JSON.stringify(sub), updatedAt: new Date() },
        { merge: true }
      );

      alert("알림이 설정됐어요! 🔔");
    } catch (e) {
      console.error("푸시 구독 오류:", e);
    }
  };

  return { requestAndSubscribe };
}