"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/app/firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

type Point = {
  x: number;
  y: number;
  color: string;
  size: number;
  uid: string;
  createdAt: any;
  isErase?: boolean;
};

export default function ArtBoard({
  roomId,
  nickname,
  scale = 1, // 친구 보드 축소
}: {
  roomId: string;
  nickname: string;
  scale?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(4);
  const [isErase, setIsErase] = useState(false);

  // 캔버스 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth * scale;
    canvas.height = 200 * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctxRef.current = ctx;
  }, [scale]);

  // 실시간 Firestore 그림 불러오기
  useEffect(() => {
    const q = query(collection(db, "art", roomId, "points"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const p = change.doc.data() as Point;
          const s = p.uid === nickname ? 1 : 1 / 16; // 친구는 축소
          ctx.strokeStyle = p.isErase ? "#fff" : p.color;
          ctx.lineWidth = p.size * s;
          ctx.beginPath();
          ctx.moveTo(p.x * s, p.y * s);
          ctx.lineTo(p.x * s, p.y * s);
          ctx.stroke();
        }
      });
    });

    return () => unsub();
  }, [nickname, roomId]);

  // 마우스 위치
  const getPos = (e: any) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = () => setDrawing(true);
  const endDraw = () => setDrawing(false);

  const draw = async (e: any) => {
    if (!drawing) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { x, y } = getPos(e);

    ctx.strokeStyle = isErase ? "#fff" : color;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.stroke();

    await addDoc(collection(db, "art", roomId, "points"), {
      x,
      y,
      color,
      size,
      uid: nickname,
      isErase,
      createdAt: serverTimestamp(),
    });
  };

  return (
    <div className="mb-2 relative">
      {/* 버튼 영역 - 항상 canvas 위에 */}
      <div className="flex gap-2 mb-1 items-center z-50 bg-white p-2 rounded shadow">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={isErase} />
        <input type="range" min={2} max={20} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        <button
          className={`px-3 py-1 rounded font-bold ${isErase ? "bg-red-400" : "bg-gray-300"}`}
          onClick={() => setIsErase(!isErase)}
        >
          {isErase ? "펜 모드" : "지우개"}
        </button>
      </div>

      {/* 캔버스 */}
      <canvas
        ref={canvasRef}
        className="w-full bg-white border rounded-xl"
        onMouseDown={startDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onMouseMove={draw}
        style={{ touchAction: "none" }} // 모바일 터치 막힘 방지
      />
    </div>
  );
}
