"use client";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/app/firebase";
import { collection, doc, getCountFromServer, getDocsFromServer, query, where, onSnapshot, type Query } from "firebase/firestore";

export async function countUnread(source: Query, nickname: string) {
  const own = where("from", "==", nickname);
  const read = where("readBy", "array-contains", nickname);
  try {
    const counts = await Promise.all([source, query(source, own), query(source, read), query(source, own, read)].map(getCountFromServer));
    const [total, mine, seen, mineSeen] = counts.map(result => result.data().count);
    return Math.max(0, total - mine - seen + mineSeen);
  } catch (error) {
    if ((error as { code?: string })?.code !== "failed-precondition") throw error;
    // Keep counts correct while the production index is being built.
    const snapshot = await getDocsFromServer(source);
    return snapshot.docs.filter(message => message.data().from !== nickname && !message.data().readBy?.includes(nickname)).length;
  }
}

export default function AppBadge() {
  useEffect(() => {
    if (!navigator.setAppBadge || !navigator.clearAppBadge) return;
    let stopProfile = () => {}, stopCounts = () => {};
    const clear = () => { void navigator.clearAppBadge().catch(() => {}); };
    const stopAuth = onAuthStateChanged(auth, user => {
      stopProfile(); stopCounts(); clear();
      if (!user) return;
      let current: string | undefined;
      stopProfile = onSnapshot(doc(db, "users", user.uid), profile => {
        const nickname: string | undefined = profile.data()?.nickname;
        if (current === nickname) return;
        current = nickname; stopCounts(); clear();
        if (!nickname) return;
        const sources = new Map<string, Query>([["dm", query(collection(db, "messages"), where("to", "==", nickname))]]);
        let active = true, generation = 0;
        const refresh = async () => {
          if (!active || document.hidden) return;
          const stamp = ++generation;
          try {
            const counts = await Promise.all(Array.from(sources.values(), source => countUnread(source, nickname)));
            if (!active || stamp !== generation) return;
            const total = counts.reduce((sum, count) => sum + count, 0);
            if (total) await navigator.setAppBadge(total); else clear();
          } catch { /* Keep the last known badge while offline. */ }
        };
        const stops = ["group_rooms", "meeting_rooms"].map(group => onSnapshot(
          query(collection(db, group), where("members", "array-contains", nickname)), rooms => {
            const previous = Array.from(sources.keys()).filter(key => key.startsWith(group + "/"));
            const next = rooms.docs.map(room => `${group}/${room.id}`);
            if (previous.length === next.length && next.every(key => sources.has(key))) return;
            previous.forEach(key => sources.delete(key));
            rooms.docs.forEach(room => sources.set(`${group}/${room.id}`, collection(db, group, room.id, "messages")));
            void refresh();
          },
        ));
        const trigger = () => { void refresh(); };
        const timer = window.setInterval(trigger, 30000);
        let readTimer: number | undefined;
        const afterRead = () => { window.clearTimeout(readTimer); readTimer = window.setTimeout(trigger, 500); };
        document.addEventListener("visibilitychange", trigger);
        window.addEventListener("wagie:messages-read", afterRead);
        trigger();
        stopCounts = () => {
          active = false; stops.forEach(stop => stop()); window.clearInterval(timer); window.clearTimeout(readTimer);
          document.removeEventListener("visibilitychange", trigger);
          window.removeEventListener("wagie:messages-read", afterRead);
        };
      });
    });
    return () => { stopAuth(); stopProfile(); stopCounts(); clear(); };
  }, []);
  return null;
}
