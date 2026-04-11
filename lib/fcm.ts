// /lib/fcm.ts
import { messagingPromise } from "@/app/firebase";
import { getToken } from "firebase/messaging";

export const getFcmToken = async () => {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const messaging = await messagingPromise;
  if (!messaging) return null;

  const token = await getToken(messaging, {
    vapidKey: "BFHu-Lp1Gn0JHQBogG-WXU5ZauaVlzPHLOYMC16DG5WZYQgRIAolrcLXLpVIQAkD3pFyGN-letMZtKm6xP2TFuk",
  });

  return token;
};