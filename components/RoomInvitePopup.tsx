"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, onSnapshot,
  doc, deleteDoc, updateDoc, arrayUnion, getDoc,
} from "firebase/firestore";

type RoomInvite = {
  id: string;
  fromNickname: string;
  toNickname: string;
  roomId: string;
  roomName: string;
  roomType: "group" | "meeting";
};

export default function RoomInvitePopup() {
  const [uid, setUid] = useState<string | null>(null);
  const [myNickname, setMyNickname] = useState<string | null>(null);
  const [queue, setQueue] = useState<RoomInvite[]>([]);
  const [current, setCurrent] = useState<RoomInvite | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) { setUid(null); return; }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setMyNickname(snap.data().nickname ?? null);
    });
  }, []);

  useEffect(() => {
    if (!uid) return;
    const seenIds = new Set<string>();
    const q = query(
      collection(db, "room_invitations"),
      where("toUid", "==", uid),
      where("status", "==", "pending")
    );
    return onSnapshot(q, (snap) => {
      const added: RoomInvite[] = [];
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          if (seenIds.has(change.doc.id)) return;
          seenIds.add(change.doc.id);
          added.push({ id: change.doc.id, ...change.doc.data() } as RoomInvite);
        }
      });
      if (added.length > 0) setQueue((prev) => [...prev, ...added]);
    });
  }, [uid]);

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((prev) => prev.slice(1));
    }
  }, [queue, current]);

  const accept = async () => {
    if (!current || !myNickname) return;
    const col = current.roomType === "group" ? "group_rooms" : "meeting_rooms";
    try {
      await updateDoc(doc(db, col, current.roomId), { members: arrayUnion(myNickname) });
      await deleteDoc(doc(db, "room_invitations", current.id));
    } catch (e) { console.error(e); }
    setCurrent(null);
  };

  const decline = async () => {
    if (!current) return;
    await deleteDoc(doc(db, "room_invitations", current.id));
    setCurrent(null);
  };

  if (!current) return null;

  return (
    <div style={{
      position: "fixed", bottom: "80px", left: "50%",
      transform: "translateX(-50%)", zIndex: 9999,
      background: "white", borderRadius: "20px",
      padding: "16px 20px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: "12px", minWidth: "260px", animation: "slideUp 0.3s ease",
    }}>
      <div style={{ fontSize: "24px" }}>{current.roomType === "group" ? "💬" : "🎥"}</div>
      <div style={{ fontWeight: 700, fontSize: "15px", textAlign: "center" }}>
        <span style={{ color: "#38bdf8" }}>{current.fromNickname}</span>님이<br />
        <span style={{ color: "#0ea5e9" }}>&ldquo;{current.roomName}&rdquo;</span>에 초대했어요!
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={decline} style={{
          padding: "8px 20px", borderRadius: "12px", border: "none",
          background: "#f0f0f0", color: "#666", fontWeight: 700,
          cursor: "pointer", fontSize: "14px",
        }}>거절</button>
        <button onClick={accept} style={{
          padding: "8px 20px", borderRadius: "12px", border: "none",
          background: "#38bdf8", color: "white", fontWeight: 700,
          cursor: "pointer", fontSize: "14px",
        }}>수락</button>
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
