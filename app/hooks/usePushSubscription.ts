"use client";

import { useEffect, useState } from "react";
import { db } from "@/app/firebase";
import { getFirebaseMessaging } from "@/app/firebase";
import { getToken } from "firebase/messaging";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

async function saveFCMToken(nickname: string) {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return;
    const token = await getToken(messaging, { vapidKey: VAPID_PUBLIC_KEY });
    if (!token) return;
    await setDoc(doc(db, "fcm_tokens", nickname), { token, updatedAt: new Date() }, { merge: true });
    console.log("FCM 토큰 저장 완료!");
  } catch(e) {
    console.error("FCM 토큰 오류:", e);
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

  useEffect(() => {
    if (!nickname) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const check = async () => {
      const granted = Notification.permission === "granted";
      setIsBlocked(Notification.permission === "denied");

      if (granted) {
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;
        try {
          const token = await getToken(messaging, { vapidKey: VAPID_PUBLIC_KEY });
          setIsSubscribed(!!token);
        } catch {
          setIsSubscribed(false);
        }
      }
    };

    check().catch(() => {});
  }, [nickname]);

  const toggle = async () => {
    if (!nickname) return;
    if (!("serviceWorker" in navigator)) {
      alert("이 브라우저는 푸쉬 알림을 지원하지 않아요.");
      return;
    }

    try {
      // 이미 구독 중 → 해제
      if (isSubscribed) {
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