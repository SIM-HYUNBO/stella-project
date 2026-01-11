"use client";

import { useEffect, useRef, useState } from "react";
import { db, auth } from "@/app/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

/* ================= 타입 ================= */
type DrawPoint = {
  x: number;
  y: number;
  color: string;
  size: number;
  uid: string;
};

/* ================= 메인 ================= */
export default function ArtBoard({ roomId }: { roomId: string }) {
  const [uid, setUid] = useState<string | null>(null);
  const [users, setUsers] = useState<string[]>([]);

  /* 로그인 */
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (u) setUid(u.uid);
    });
  }, []);

  /* 참여자 수집 */
  useEffect(() => {
    const q = query(
      collection(db, "art", roomId, "points"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      const set = new Set<string>();
      snap.forEach((d) => set.add(d.data().uid));
      setUid((me) => {
        if (me) set.add(me);
        return me;
      });
      setUsers(Array.from(set));
    });
  }, [roomId]);

  if (!uid) return null;

  const me = uid;
  const others = users.filter((u) => u !== me);

  return (
    <div className="p-2 bg-amber-50">

      {/* 내 보드 */}
      <Canvas
        roomId={roomId}
        ownerUid={me}
        me={me}
        big
      />

      {/* 친구 보드 */}
      <div className="flex gap-2 mt-3 overflow-x-auto">
        {others.map((u) => (
          <Canvas
            key={u}
            roomId={roomId}
            ownerUid={u}
            me={me}
          />
        ))}
      </div>
    </div>
  );
}

/* ================= 캔버스 ================= */
function Canvas({
  roomId,
  ownerUid,
  me,
  big = false,
}: {
  roomId: string;
  ownerUid: string;
  me: string;
  big?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);

  const scale = big ? 1 : 0.25;
  const canDraw = ownerUid === me && big;

  /* 초기화 */
  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.width = 600 * scale;
    canvas.height = 360 * scale;

    const ctx = canvas.getContext("2d")!;
    ctx.lineCap = "round";
    ctxRef.current = ctx;
  }, [scale]);

  /* 실시간 수신 */
  useEffect(() => {
    const q = query(
      collection(db, "art", roomId, "points"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      snap.forEach((d) => {
        const p = d.data() as DrawPoint;
        if (p.uid !== ownerUid) return;

        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * scale;
        ctx.beginPath();
        ctx.lineTo(p.x * scale, p.y * scale);
        ctx.stroke();
      });
    });
  }, [roomId, ownerUid, scale]);

  /* 좌표 */
  const pos = (e: any) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return {
      x: (t.clientX - rect.left) / scale,
      y: (t.clientY - rect.top) / scale,
    };
  };

  /* 그리기 */
  const draw = async (e: any) => {
    if (!drawing.current || !canDraw) return;
    const { x, y } = pos(e);

    await addDoc(collection(db, "art", roomId, "points"), {
      x,
      y,
      color: "#000",
      size: 4,
      uid: me,
      createdAt: Date.now(),
    });
  };

  /* 전체 지우기 (내 보드만) */
  const clearAll = async () => {
    if (!canDraw) return;
    const snap = await getDocs(collection(db, "art", roomId, "points"));
    snap.forEach((d) => deleteDoc(d.ref));
  };

  return (
    <div>
      {canDraw && (
        <button
          onClick={clearAll}
          className="mb-1 text-xs bg-red-400 px-2 py-1 rounded text-white"
        >
          전체 지우기
        </button>
      )}

      <canvas
        ref={canvasRef}
        className="bg-white border rounded-xl touch-none"
        onMouseDown={() => (drawing.current = true)}
        onMouseUp={() => (drawing.current = false)}
        onMouseLeave={() => (drawing.current = false)}
        onMouseMove={draw}
        onTouchStart={() => (drawing.current = true)}
        onTouchEnd={() => (drawing.current = false)}
        onTouchMove={draw}
      />
    </div>
  );
}
