"use client";

import { useEffect, useRef } from "react";
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
};

export default function ArtBoard({ roomId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  /* 캔버스 초기화 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#000";
  }, []);

  /* 실시간 수신 */
  useEffect(() => {
    const q = query(
      collection(db, "art", roomId, "strokes"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      snap.docChanges().forEach((c) => {
        if (c.type === "added") {
          const { x, y } = c.doc.data();
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      });
    });
  }, [roomId]);

  const getPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const start = (e: React.MouseEvent) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    drawing.current = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const end = () => {
    drawing.current = false;
  };

  const move = async (e: React.MouseEvent) => {
    if (!drawing.current) return;

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();

    await addDoc(collection(db, "art", roomId, "strokes"), {
      x,
      y,
      createdAt: serverTimestamp(),
    });
  };

  return (
    <div className="w-full h-64 bg-white border rounded-xl overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={start}
        onMouseUp={end}
        onMouseLeave={end}
        onMouseMove={move}
      />
    </div>
  );
}
