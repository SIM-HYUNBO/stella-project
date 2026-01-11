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
  getDocs,
  deleteDoc,
} from "firebase/firestore";

type Stroke = {
  x: number;
  y: number;
  color: string;
  size: number;
};

type Props = {
  roomId: string;
};

export default function ArtBoard({ roomId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(4);

  /* ===============================
     캔버스 초기화
  =============================== */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctxRef.current = ctx;

    return () => window.removeEventListener("resize", resize);
  }, []);

  /* ===============================
     실시간 그림 수신
  =============================== */
  useEffect(() => {
    const q = query(
      collection(db, "art", roomId, "strokes"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const p = change.doc.data() as Stroke;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      });
    });
  }, [roomId]);

  /* ===============================
     좌표 계산 (모바일 + PC)
  =============================== */
  const getPos = (e: any) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  /* ===============================
     그리기
  =============================== */
  const start = (e: any) => {
    e.preventDefault();
    setDrawing(true);
  };

  const end = () => setDrawing(false);

  const move = async (e: any) => {
    if (!drawing) return;

    const ctx = ctxRef.current;
    if (!ctx) return;

    const { x, y } = getPos(e);

    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.lineTo(x, y);
    ctx.stroke();

    await addDoc(collection(db, "art", roomId, "strokes"), {
      x,
      y,
      color,
      size,
      createdAt: serverTimestamp(),
    });
  };

  /* ===============================
     🔥 전체 지우기
  =============================== */
  const clearAll = async () => {
    const snap = await getDocs(
      collection(db, "art", roomId, "strokes")
    );

    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  /* ===============================
     UI
  =============================== */
  return (
    <div className="px-3 pb-3">
      {/* 도구 */}
      <div className="flex items-center gap-2 mb-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <input
          type="range"
          min={2}
          max={20}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        />
        <button
          onClick={clearAll}
          className="ml-auto px-3 py-1 text-sm bg-red-500 text-white rounded-lg"
        >
          전체 지우기
        </button>
      </div>

      {/* 캔버스 */}
      <div className="w-full h-64 bg-white border rounded-xl overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
    </div>
  );
}
