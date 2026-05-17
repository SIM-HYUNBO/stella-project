"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";

type Request = {
  id: string;
  from: string;
  fromNickname: string;
};

export default function FriendRequestPopup() {
  const [popup, setPopup] = useState<Request | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUid(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUid) return;

    const q = query(
      collection(db, "friend_requests"),
      where("to", "==", currentUid),
      where("status", "==", "pending")
    );

    const seenIds = new Set<string>();

    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const id = change.doc.id;
          if (seenIds.has(id)) return;
          seenIds.add(id);
          const data = change.doc.data();
          setPopup({ id, from: data.from, fromNickname: data.fromNickname });
        }
      });
    });

    return () => unsub();
  }, [currentUid]);

  const accept = async () => {
    if (!popup || !currentUid) return;
    const chatId = [currentUid, popup.from].sort().join("_");
    await setDoc(doc(db, "friends", chatId), {
      users: [currentUid, popup.from],
      createdAt: Date.now(),
    });
    await deleteDoc(doc(db, "friend_requests", popup.id));
    setPopup(null);
  };

  const decline = async () => {
    if (!popup) return;
    await deleteDoc(doc(db, "friend_requests", popup.id));
    setPopup(null);
  };

  if (!popup) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      background: "white",
      borderRadius: "20px",
      padding: "16px 20px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "12px",
      minWidth: "260px",
      animation: "slideUp 0.3s ease",
    }}>
      <div style={{ fontSize: "24px" }}>👋</div>
      <div style={{ fontWeight: 700, fontSize: "15px", textAlign: "center" }}>
        <span style={{ color: "#7c54d9" }}>{popup.fromNickname}</span>님이 친구 요청을 보냈어요!
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={accept} style={{
          padding: "8px 20px",
          borderRadius: "12px",
          border: "none",
          background: "#7c54d9",
          color: "white",
          fontWeight: 700,
          cursor: "pointer",
          fontSize: "14px",
        }}>수락</button>
        <button onClick={decline} style={{
          padding: "8px 20px",
          borderRadius: "12px",
          border: "none",
          background: "#f0f0f0",
          color: "#666",
          fontWeight: 700,
          cursor: "pointer",
          fontSize: "14px",
        }}>거절</button>
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
