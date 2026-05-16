import { getMessaging, getToken } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/app/firebase";

export async function saveFCMToken(nickname: string) {
  try {
    const messaging = getMessaging();
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
    });

    if (!token) return;

    await setDoc(doc(db, "fcm_tokens", nickname), {
      token,
      updatedAt: new Date(),
    });

    console.log("FCM 토큰 저장 완료!");
  } catch (e) {
    console.error("FCM 토큰 저장 실패:", e);
  }
}