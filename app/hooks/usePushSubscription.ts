// app/hooks/usePushSubscription.ts
"use client";

import { useEffect, useState } from "react";
import { db } from "@/app/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

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
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const init = async () => {
      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub && Notification.permission === "granted");
    };

    init().catch(() => {});
  }, []);

  const toggle = async () => {
    if (!nickname || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (isSubscribed && sub) {
        // 구독 취소
        await sub.unsubscribe();
        await deleteDoc(doc(db, "push_subscriptions", nickname));
        setIsSubscribed(false);
        return;
      }

      // 권한 요청 먼저
      const permission = await Notification.requestPermission();
      
      // 권한 결과 확인 후 처리
      if (permission === "denied") {
        alert("브라우저 설정에서 알림을 허용해주세요.");
        return;
      }

      if (permission === "default") {
        // 사용자가 팝업을 닫은 경우
        return;
      }

      // granted인 경우만 구독
      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await setDoc(
        doc(db, "push_subscriptions", nickname),
        { subscription: JSON.stringify(newSub), updatedAt: new Date() },
        { merge: true }
      );

      setIsSubscribed(true);
    } catch (e) {
      console.error("푸시 구독 오류:", e);
    }
  };

  return { isSubscribed, toggle };
}