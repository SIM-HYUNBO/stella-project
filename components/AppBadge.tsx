"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/app/firebase";
import { collection, doc, getDoc, query, where, onSnapshot } from "firebase/firestore";

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

    let roomMsgUnsubs: (() => void)[] = [];
    const countsPerRoom: Record<string, number> = {};

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubDm) { unsubDm(); unsubDm = null; }
      if (unsubGroup) { unsubGroup(); unsubGroup = null; }
      roomMsgUnsubs.forEach(u => u());
      roomMsgUnsubs = [];

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

      // 방 목록 감지 → 각 방 메시지에 개별 onSnapshot 설정
      unsubGroup = onSnapshot(
        query(collection(db, "group_rooms"), where("members", "array-contains", nickname)),
        (roomSnap) => {
          // 기존 방 메시지 리스너 정리
          roomMsgUnsubs.forEach(u => u());
          roomMsgUnsubs = [];

          const activeRoomIds = new Set(roomSnap.docs.map(d => d.id));
          // 삭제된 방 카운트 제거
          Object.keys(countsPerRoom).forEach(id => {
            if (!activeRoomIds.has(id)) delete countsPerRoom[id];
          });

          roomSnap.docs.forEach(roomDoc => {
            const roomId = roomDoc.id;
            const unsub = onSnapshot(
              collection(db, "group_rooms", roomId, "messages"),
              (msgSnap) => {
                let count = 0;
                msgSnap.forEach(m => {
                  const data = m.data();
                  if (data.from !== nickname && !(data.readBy || []).includes(nickname)) count++;
                });
                countsPerRoom[roomId] = count;
                groupCount = Object.values(countsPerRoom).reduce((a, b) => a + b, 0);
                updateBadge();
              }
            );
            roomMsgUnsubs.push(unsub);
          });
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubDm) unsubDm();
      if (unsubGroup) unsubGroup();
      roomMsgUnsubs.forEach(u => u());
      (navigator as any).clearAppBadge?.().catch(() => {});
    };
  }, []);

  return null;
}
