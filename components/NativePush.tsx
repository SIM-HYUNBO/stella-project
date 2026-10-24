"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { PushNotifications } from "@capacitor/push-notifications";
import type { PluginListenerHandle } from "@capacitor/core";
import { auth, db } from "@/app/firebase";
import { saveFCMToken } from "@/app/hooks/usePushSubscription";
import { isAndroidApp, notificationPath, stopNativePush } from "@/lib/native-push";
export default function NativePush() {
  const router = useRouter();
  useEffect(() => {
    if (!isAndroidApp()) return;
    let active = true, previousUid: string | null = null;
    const handles: PluginListenerHandle[] = [];
    const listen = async () => {
      const handle = await PushNotifications.addListener("pushNotificationActionPerformed", action => {
        const path = notificationPath(action.notification.data?.url);
        if (active && path) router.push(path);
      });
      if (active) handles.push(handle); else await handle.remove();
    };
    void listen().catch(() => {});
    const unsubscribe = onAuthStateChanged(auth, user => {
      const oldUid = previousUid;
      previousUid = user?.uid || null;
      void (async () => {
        if (oldUid && oldUid !== user?.uid) await stopNativePush();
        if (!user) return;
        const profile = await getDoc(doc(db, "users", user.uid));
        if (active && auth.currentUser?.uid === user.uid && profile.data()?.nickname) await saveFCMToken(profile.data()!.nickname, true);
      })().catch(() => { window.dispatchEvent(new Event("wagie:push-preference")); });
    });
    return () => { active = false; unsubscribe(); handles.forEach(handle => { void handle.remove(); }); };
  }, [router]);
  return null;
}
