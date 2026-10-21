"use client";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/app/firebase";
import { collection, doc, query, where, onSnapshot } from "firebase/firestore";

export default function AppBadge() {
  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    const badge = navigator as any;
    let generation = 0, stops: (() => void)[] = [], profileStop = () => {};
    const clear = () => { stops.forEach(s => s()); stops = []; badge.clearAppBadge?.().catch(() => {}); };
    const stopAuth = onAuthStateChanged(auth, user => {
      const token = ++generation; profileStop(); clear();
      if (!user) return;
      let current = "";
      profileStop = onSnapshot(doc(db, "users", user.uid), profile => {
        const nickname = profile.data()?.nickname;
        if (token !== generation || !nickname || current === nickname) return;
        current = nickname; clear();
        let dm = 0;
        const counts = new Map<string, number>();
        const update = () => {
          if (token !== generation || current !== nickname) return;
          const total = dm + Array.from(counts.values()).reduce((a, b) => a + b, 0);
          (total ? badge.setAppBadge(total) : badge.clearAppBadge()).catch(() => {});
        };
        stops.push(onSnapshot(query(collection(db, "messages"), where("to", "==", nickname)), snap => {
          dm = snap.docs.filter(d => d.data().from !== nickname && !d.data().readBy?.includes(nickname)).length; update();
        }));
        for (const group of ["group_rooms", "meeting_rooms"]) {
          const roomStops = new Map<string, () => void>();
          stops.push(() => roomStops.forEach(stop => stop()));
          stops.push(onSnapshot(query(collection(db, group), where("members", "array-contains", nickname)), rooms => {
            const active = new Set(rooms.docs.map(d => d.id));
            roomStops.forEach((stop, id) => { if (!active.has(id)) { stop(); roomStops.delete(id); counts.delete(`${group}/${id}`); } });
            update();
            rooms.docs.forEach(room => {
              if (roomStops.has(room.id)) return;
              roomStops.set(room.id, onSnapshot(collection(db, group, room.id, "messages"), snap => {
                counts.set(`${group}/${room.id}`, snap.docs.filter(d => d.data().from !== nickname && !d.data().readBy?.includes(nickname)).length); update();
              }));
            });
          }));
        }
      });
    });
    return () => { generation++; stopAuth(); profileStop(); clear(); };
  }, []);
  return null;
}
