"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/app/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

type Props = {
  roomId: string;
  ownerUid: string;
  nickname: string;
  readonly: boolean;
};

export default function ArtCanvas({
  roomId,
  ownerUid,
  nickname,
  readonly,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;

    const ctx = canvas.getContext("2d")!;
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000";
    ctxRef.current = ctx;
  }, []);

  /* 실시간 수신 */
  useEffect(() => {
    const q = query(
      collection(db, "artRooms", roomId, "boards", ownerUid, "points"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      snap.docChanges().forEach((c) => {
        if (c.type === "added") {
          const { x, y } = c.doc.data();
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      });
    });
  }, [roomId, ownerUid]);

  const pos = (e: any) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const draw = async (e: any) => {
    if (!drawing || readonly) return;
    const { x, y } = pos(e);

    await addDoc(
      collection(db, "artRooms", roomId, "boards", ownerUid, "points"),
      { x, y, createdAt: serverTimestamp() }
    );
  };

  return (
    <div className="border rounded-xl bg-white p-1">
      <div className="text-xs font-bold text-center mb-1">
        {nickname} {readonly && "👀"}
      </div>
      <canvas
        ref={canvasRef}
        className="w-full border rounded"
        onMouseDown={() => !readonly && setDrawing(true)}
        onMouseUp={() => setDrawing(false)}
        onMouseLeave={() => setDrawing(false)}
        onMouseMove={draw}
      />
    </div>
  );
}
