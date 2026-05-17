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

        // 구슬 반응 이벤트
        window.dispatchEvent(new CustomEvent("newChatMessage", {
          detail: { title, body }
        }));

        if (document.visibilityState === "hidden") return;
        try {
          new Notification(title, {
            body,
            icon: "/favicon.png",
            badge: "/favicon.png",
            tag: "fcm-fg",
            renotify: true,
          });
        } catch {
          // 포그라운드 알림 미지원 환경
        }
      });
    };

    setup().catch(() => {});
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  return null;
}
