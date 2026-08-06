"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ec4899", "#fbbf24", "#1a1a1a"];
const SIZES = [{ label: "S", px: 3 }, { label: "M", px: 7 }, { label: "L", px: 16 }];

export default function PhotoDrawPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [color, setColor] = useState("#ef4444");
  const [sizeIdx, setSizeIdx] = useState(1);
  const [isEraser, setIsEraser] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const drawing = useRef(false);
  const currentPoints = useRef<{ x: number; y: number }[]>([]);

  const CANVAS_W = 1200;
  const CANVAS_H = 800;

  // 흰 배경 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f8f8f8";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }, []);

  const loadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      // 비율 맞춰 중앙에 그리기
      const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (CANVAS_W - w) / 2;
      const y = (CANVAS_H - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      setHasPhoto(true);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
    e.target.value = "";
  };

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = CANVAS_W / rect.width;
    const sy = CANVAS_H / rect.height;
    if ("touches" in e) {
      const t = (e as React.TouchEvent).touches[0];
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy };
    }
    const me = e as React.MouseEvent;
    return { x: (me.clientX - rect.left) * sx, y: (me.clientY - rect.top) * sy };
  };

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    drawing.current = true;
    const pos = getPos(e);
    currentPoints.current = [pos];
    ctx.strokeStyle = isEraser ? "#ffffff" : color;
    ctx.lineWidth = isEraser ? SIZES[sizeIdx].px * 4 : SIZES[sizeIdx].px;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const moveDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    // 이전 점과 너무 멀면 무시 (튀는 선 방지)
    const last = currentPoints.current[currentPoints.current.length - 1];
    if (last && Math.hypot(pos.x - last.x, pos.y - last.y) > 80) return;
    currentPoints.current.push(pos);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const endDraw = () => {
    drawing.current = false;
    currentPoints.current = [];
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "wagie-photo-draw.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleShare = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "wagie-photo-draw.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "WAGIE 사진 그림 🎨" }).catch(() => {});
      } else {
        handleSave();
      }
    });
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#1a1a2e" }}>

      {/* 상단 바 */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: "#16213e" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-lg active:scale-90 transition-transform">‹</button>
          <div>
            <p className="text-white font-black text-sm">사진에 그림 그리기</p>
            <p className="text-white/40 text-[10px]">사진을 불러와서 그려요</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95 transition bg-white/15">
            📷 사진
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95 transition" style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>저장</button>
          <button onClick={handleShare} className="px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95 transition bg-white/15">공유</button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={loadPhoto} className="hidden" />

      {/* 캔버스 */}
      <div className="flex-1 overflow-hidden p-2">
        {!hasPhoto && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none z-10">
            <p className="text-4xl opacity-40">📷</p>
            <p className="text-white/30 text-sm">위에서 사진을 불러오세요</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-2xl touch-none"
          style={{ width: "100%", height: "100%", display: "block", cursor: isEraser ? "cell" : "crosshair" }}
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
          onTouchCancel={endDraw}
        />
      </div>

      {/* 하단 툴바 */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-3" style={{ background: "#16213e" }}>
        <div className="flex gap-2 flex-1 overflow-x-auto">
          {COLORS.map((c) => (
            <button key={c} onClick={() => { setColor(c); setIsEraser(false); }}
              className="shrink-0 active:scale-90 transition-transform"
              style={{
                width: 28, height: 28, borderRadius: "50%", background: c,
                border: !isEraser && color === c ? "3px solid #a855f7" : "2px solid rgba(255,255,255,0.2)",
                boxShadow: !isEraser && color === c ? "0 0 0 2px #a855f7" : "none",
              }}
            />
          ))}
        </div>
        <div className="w-px h-6 bg-white/20 shrink-0" />
        <div className="flex gap-1.5 shrink-0">
          {SIZES.map((s, i) => (
            <button key={i} onClick={() => setSizeIdx(i)}
              className={`rounded-full flex items-center justify-center active:scale-90 transition-all ${sizeIdx === i ? "bg-purple-500" : "bg-white/10"}`}
              style={{ width: 28, height: 28 }}>
              <div className="rounded-full bg-white" style={{ width: s.px, height: s.px }} />
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-white/20 shrink-0" />
        <button onClick={() => setIsEraser(!isEraser)}
          className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-lg active:scale-90 transition-all ${isEraser ? "bg-purple-500" : "bg-white/10"}`}>
          🧹
        </button>
      </div>
    </div>
  );
}
