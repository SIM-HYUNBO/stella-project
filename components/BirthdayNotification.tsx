"use client";

import { useEffect } from "react";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

export default function BirthdayNotification() {
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      if (Notification.permission !== "granted") return;

      const today = new Date();
      const todayKey = `${today.getMonth() + 1}-${today.getDate()}`;
      const storageKey = `birthday_notified_${user.uid}_${today.getFullYear()}-${todayKey}`;

      if (localStorage.getItem(storageKey)) return;

      try {
        const q = query(collection(db, "friends"), where("users", "array-contains", user.uid));
        const snap = await getDocs(q);

        const birthdayFriends: string[] = [];

        for (const friendDoc of snap.docs) {
          const users: string[] = friendDoc.data().users || [];
          const friendUid = users.find((u) => u !== user.uid);
          if (!friendUid) continue;

          const userSnap = await getDoc(doc(db, "users", friendUid));
          if (!userSnap.exists()) continue;

          const { birth, nickname } = userSnap.data();
          if (!birth || !nickname) continue;

          // birth 형식: "YYYY-MM-DD"
          const [, month, day] = birth.split("-");
          const friendKey = `${parseInt(month)}-${parseInt(day)}`;

          if (friendKey === todayKey) {
            birthdayFriends.push(nickname);
          }
        }

        if (birthdayFriends.length === 0) return;

        localStorage.setItem(storageKey, "1");

        for (const name of birthdayFriends) {
          new Notification(`🎂 오늘 ${name} 생일이에요!`, {
            body: `${name}에게 생일 축하 메시지를 보내보세요 🎉`,
            icon: "/wag.png",
            badge: "/wag.png",
            tag: `birthday-${name}`,
          });
        }
      } catch (e) {
        console.error("생일 알림 오류:", e);
      }
    });

    return () => unsub();
  }, []);

  return null;
}
