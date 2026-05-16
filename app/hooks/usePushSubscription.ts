"use client";

import { useEffect, useState } from "react";
import { db } from "@/app/firebase";
import { getFirebaseMessaging } from "@/app/firebase";
import { getToken } from "firebase/messaging";
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

async function saveFCMToken(nickname: string) {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return;
    const token = await getToken(messaging, { vapidKey: VAPID_PUBLIC_KEY });
    if (!token) return;
    await setDoc(doc(db, "fcm_tokens", nickname), { token, updatedAt: new Date() }, { merge: true });
  } catch {
    // FCM 미지원 환경 무시
  }
}

async function deleteFCMToken(nickname: string) {
  try {
    await deleteDoc(doc(db, "fcm_tokens", nickname));
  } catch {
    // 무시
  }
}

export function usePushSubscription(nickname: string | null) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // 기존 구독 여부만 확인 (자동 권한 요청 없음)
  useEffect(() => {
    if (!nickname) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const check = async () => {
      // 레거시 sw-push.js 제거
      const allRegs = await navigator.serviceWorker.getRegistrations();
      for (const reg of allRegs) {
        if (reg.active?.scriptURL.includes("sw-push.js")) {
          const oldSub = await reg.pushManager.getSubscription();
          if (oldSub) {
            await oldSub.unsubscribe();
            await deleteDoc(doc(db, "push_subscriptions", nickname)).catch(() => {});
          }
          await reg.unregister();
        }
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const granted = Notification.permission === "granted";

      setIsBlocked(Notification.permission === "denied");
      setIsSubscribed(!!sub && granted);
    };

    check().catch(() => {});
  }, [nickname]);
const toggle = async () => {
  console.log("toggle 실행됨!", nickname); // 추가
  if (!nickname) return;
  // 🔔 버튼 클릭 시 호출
  const toggle = async () => {
    if (!nickname) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("이 브라우저는 푸쉬 알림을 지원하지 않아요.");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      // 이미 구독 중 → 해제
      if (isSubscribed && sub) {
        await sub.unsubscribe();
        await deleteDoc(doc(db, "push_subscriptions", nickname));
        await deleteFCMToken(nickname);
        setIsSubscribed(false);
        return;
      }

      // 권한 요청
      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;

      if (permission === "denied") {
        setIsBlocked(true);
        alert("알림이 차단되어 있어요.\n브라우저 주소창 🔒 → 알림 → 허용으로 변경해주세요.");
        return;
      }

      if (permission !== "granted") return;

      // Web Push 구독
      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await setDoc(
        doc(db, "push_subscriptions", nickname),
        { subscription: JSON.stringify(newSub), updatedAt: new Date() },
        { merge: true }
      );

      // FCM 토큰 저장
      await saveFCMToken(nickname);

      setIsSubscribed(true);
    } catch (e: any) {
      console.error("푸시 구독 오류:", e);
      alert(`알림 설정 실패: ${e?.message ?? e}`);
    }
  };

  return { isSubscribed, isBlocked, toggle };
}
}
