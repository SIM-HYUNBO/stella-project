"use client";

import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "@/app/firebase";

export default function FCMToken() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (Notification.permission !== "granted") return;

    let unsubscribe = null;

    const setup = async () => {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;

      unsubscribe = onMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? "새 메시지";
        const body = payload.notification?.body ?? "";

        // 포그라운드일 땐 구슬 반응만 (서비스 워커가 백그라운드 알림 담당)
        window.dispatchEvent(new CustomEvent("newChatMessage", {
          detail: { title, body }
        }));
      });
    };

    setup().catch(() => {});
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  return null;
}
