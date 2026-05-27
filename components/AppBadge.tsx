"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/app/firebase";
import { collection, doc, getDoc, getDocs, query, where, onSnapshot } from "firebase/firestore";

export default function AppBadge() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("setAppBadge" in navigator)) return;

    let unsubDm: (() => void) | null = null;
    let unsubGroup: (() => void) | null = null;
    let dmCount = 0;
    let groupCount = 0;

    const updateBadge = () => {
      const total = dmCount + groupCount;
      if (total > 0) {
        (navigator as any).setAppBadge(total).catch(() => {});
      } else {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    };

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubDm) { unsubDm(); unsubDm = null; }
      if (unsubGroup) { unsubGroup(); unsubGroup = null; }

      if (!user) {
        dmCount = 0; groupCount = 0;
        (navigator as any).clearAppBadge?.().catch(() => {});
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) return;
      const nickname: string = snap.data().nickname;

      unsubDm = onSnapshot(
        query(collection(db, "messages"), where("to", "==", nickname)),
        (s) => {
          let n = 0;
          s.forEach((d) => {
            const data = d.data();
            if (data.from !== nickname && !data.readBy?.includes(nickname)) n++;
          });
          dmCount = n;
          updateBadge();
        }
      );

      unsubGroup = onSnapshot(
        query(collection(db, "group_rooms"), where("members", "array-contains", nickname)),
        async (s) => {
          let total = 0;
          for (const d of s.docs) {
            const msgSnap = await getDocs(collection(db, "group_rooms", d.id, "messages"));
            msgSnap.forEach((m) => {
              const data = m.data();
              if (data.from !== nickname && !data.readBy?.includes(nickname)) total++;
            });
          }
          groupCount = total;
          updateBadge();
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubDm) unsubDm();
      if (unsubGroup) unsubGroup();
      (navigator as any).clearAppBadge?.().catch(() => {});
    };
  }, []);

  return null;
}
