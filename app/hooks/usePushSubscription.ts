"use client";
import { useEffect, useState } from "react";
import { auth, db, getFirebaseMessaging } from "@/app/firebase";
import { getToken } from "firebase/messaging";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
const EVENT = "wagie:push-preference";

export async function saveFCMToken(nickname: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  const profile = await getDoc(doc(db, "users", user.uid));
  if (profile.data()?.pushEnabled === false) return false;
  const messaging = await getFirebaseMessaging();
  if (!messaging) return false;
  const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY });
  if (!token) return false;
  await setDoc(doc(db, "fcm_tokens", nickname), { token, uid: user.uid, updatedAt: new Date() }, { merge: true });
  return true;
}

export async function setPushPreference(enabled: boolean) {
  const user = auth.currentUser;
  if (!user) throw Error("다시 로그인해 줘.");
  if (enabled) {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) throw Error("이 브라우저는 푸시 알림을 지원하지 않아.");
    const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (permission !== "granted") throw Error("브라우저 주소 옆 권한 설정에서 알림을 허용해 줘.");
  }
  const ref = doc(db, "users", user.uid), profile = await getDoc(ref);
  const previous = profile.data()?.pushEnabled !== false;
  await updateDoc(ref, { pushEnabled: enabled });
  localStorage.setItem("notificationsEnabled", String(enabled));
  try {
    if (enabled && !await saveFCMToken(profile.data()?.nickname)) throw Error("알림을 등록하지 못했어. 다시 시도해 줘.");
  } catch (e) {
    await updateDoc(ref, { pushEnabled: previous }); localStorage.setItem("notificationsEnabled", String(previous));
    throw e;
  } finally { window.dispatchEvent(new Event(EVENT)); }
}

export function usePushSubscription(nickname: string | null) {
  const [isSubscribed, setIsSubscribed] = useState(false), [isBlocked, setIsBlocked] = useState(false);
  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!nickname || typeof Notification === "undefined" || !auth.currentUser) return;
      if (active) setIsBlocked(Notification.permission === "denied");
      try { const enabled = await saveFCMToken(nickname); if (active) setIsSubscribed(enabled); }
      catch { if (active) setIsSubscribed(false); }
    };
    void check(); window.addEventListener(EVENT, check);
    return () => { active = false; window.removeEventListener(EVENT, check); };
  }, [nickname]);
  const toggle = async () => { try { await setPushPreference(!isSubscribed); setIsSubscribed(!isSubscribed); } catch (e) { alert(e instanceof Error ? e.message : "알림 설정을 바꾸지 못했어."); } };
  return { isSubscribed, isBlocked, toggle };
}
