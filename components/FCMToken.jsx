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
        const title = payload.data?.title ?? payload.notification?.title ?? "새 메시지";
        const body = payload.data?.body ?? payload.notification?.body ?? "";

        // 포그라운드 띵 소리
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(1046, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.4, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.45);
        } catch {}

        window.dispatchEvent(new CustomEvent("newChatMessage", { detail: { title, body } }));
      });
    };

    setup().catch(() => {});
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  return null;
}
