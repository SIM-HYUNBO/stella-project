"use client";

import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "@/app/firebase";

export default function FCMToken() {
  useEffect(() => {
    const init = async () => {
      try {
        const permission =
          await Notification.requestPermission();

        if (permission !== "granted") {
          console.log("알림 거부");
          return;
        }

        const messaging =
          await getFirebaseMessaging();

        if (!messaging) {
          console.log("FCM 미지원");
          return;
        }

        const token = await getToken(messaging, {
          vapidKey: "BFHu-Lp1Gn0JHQBogG-WXU5ZauaVlzPHLOYMC16DG5WZYQgRIAolrcLXLpVIQAkD3pFyGN-letMZtKm6xP2TFuk",
        });

        console.log("FCM TOKEN:", token);

        onMessage(messaging, (payload) => {
          console.log("포그라운드 메시지:", payload);
        });
      } catch (err) {
        console.error(err);
      }
    };

    init();
  }, []);

  return null;
}