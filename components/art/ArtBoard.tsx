"use client";

import { useEffect, useRef, useState } from "react";
import { db, auth } from "@/app/firebase";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type User = {
  uid: string;
  nickname: string;
};

export default function ArtBoard({ roomId }: { roomId: string }) {
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  /* 로그인 */
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) return;

      const nickname = u.displayName || "익명";
      setMe({ uid: u.uid, nickname });

      await setDoc(
        doc(db, "artRooms", roomId, "users", u.uid),
        { nickname },
        { merge: true }
      );
    });
  }, [roomId]);

  /* 유저 목록 */
  useEffect(() => {
    const q = collection(db, "artRooms", roomId, "users");
    return onSnapshot(q, (snap) => {
      setUsers(
        snap.docs.map((d) => ({
          uid: d.id,
          nickname: d.data().nickname,
        }))
      );
    });
  }, [roomId]);

  if (!me) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2 bg-amber-50">
      {users.map((u) => (
        <UserCanvas
          key={u.uid}
          roomId={roomId}
          user={u}
          isMe={u.uid === me.uid}
        />
      ))}
    </div>
  );
}

/* ================= 캔버스 ================= */

function UserCanvas({
  roomId,
  user,
  isMe,
}: {
  roomId: string;
  user: User;
  isMe: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);

  /* canvas 초기화 */
  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.width = canvas.offsetWidth;
    canvas.height = 260;

    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";

    ctxRef.current = ctx;
  }, []);

  /* stroke 수신 */
  useEffect(() => {
    const q = query(
      collection(db, "artRooms", roomId, "users", user.uid, "strokes"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      snap.docChanges().forEach((c) => {
        const { x, y, type } = c.doc.data();
        if (type === "start") {
          ctx.beginPath();
          ctx.moveTo(x, y);
        }
        if (type === "draw") {
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      });
    });
  }, [roomId, user.uid]);

  /* 좌표 */
  const pos = (e: any) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const t = e.touches?.[0];
    return {
      x: (t ? t.clientX : e.clientX) - r.left,
      y: (t ? t.clientY : e.clientY) - r.top,
    };
  };

  const start = async (e: any) => {
    if (!isMe) return;
    e.preventDefault();
    drawing.current = true;
    const { x, y } = pos(e);

    await addDoc(
      collection(db, "artRooms", roomId, "users", user.uid, "strokes"),
      { x, y, type: "start", createdAt: serverTimestamp() }
    );
  };

  const move = async (e: any) => {
    if (!drawing.current || !isMe) return;
    e.preventDefault();
    const { x, y } = pos(e);

    await addDoc(
      collection(db, "artRooms", roomId, "users", user.uid, "strokes"),
      { x, y, type: "draw", createdAt: serverTimestamp() }
    );
  };

  const end = () => (drawing.current = false);

  return (
    <div className="bg-white rounded-xl p-2 shadow">
      <div className="text-xs mb-1 font-bold text-center">
        {user.nickname} {isMe && "(나)"}
      </div>

      <canvas
        ref={canvasRef}
        className="w-full rounded border touch-none"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
    </div>
  );
}
