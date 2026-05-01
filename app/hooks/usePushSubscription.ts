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
      // 기존 sw-push.js 등록 제거 (레거시 마이그레이션)
      const allRegs = await navigator.serviceWorker.getRegistrations();
      for (const reg of allRegs) {
        if (reg.active?.scriptURL.includes("sw-push.js")) {
          const oldSub = await reg.pushManager.getSubscription();
          if (oldSub) {
            await oldSub.unsubscribe();
            if (nickname) {
              await deleteDoc(doc(db, "push_subscriptions", nickname)).catch(() => {});
            }
          }
          await reg.unregister();
        }
      }

      // 메인 SW(sw.js) 등록을 사용 — 브라우저/잠금화면에서도 안정적으로 동작
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub && Notification.permission === "granted");
    };

    init().catch(() => {});
  }, [nickname]);

  const toggle = async () => {
    if (!nickname) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("이 브라우저는 푸쉬 알림을 지원하지 않아요.");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (isSubscribed && sub) {
        await sub.unsubscribe();
        await deleteDoc(doc(db, "push_subscriptions", nickname));
        setIsSubscribed(false);
        return;
      }

      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission === "denied") {
        alert("알림이 차단되어 있어요.\n브라우저 주소창 왼쪽 자물쇠 아이콘 → 알림 → 허용 으로 변경해주세요.");
        return;
      }

      if (permission !== "granted") return;

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
    } catch (e: any) {
      console.error("푸시 구독 오류:", e);
      alert(`알림 설정 실패: ${e?.message ?? e}`);
    }
  };

  return { isSubscribed, toggle };
}
