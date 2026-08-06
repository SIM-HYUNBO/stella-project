"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ec4899", "#fbbf24", "#1a1a1a"];
const SIZES = [{ label: "S", px: 3 }, { label: "M", px: 7 }, { label: "L", px: 16 }];

export default function PhotoDrawPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [color, setColor] = useState("#ef4444");
  const [sizeIdx, setSizeIdx] = useState(1);
  const [isEraser, setIsEraser] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // 컨테이너 크기로 캔버스 크기 설정
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const w = Math.floor(width);
    const h = Math.floor(height);
    setCanvasSize({ w, h });
    [photoCanvasRef, drawCanvasRef].forEach(ref => {
      if (!ref.current) return;
      ref.current.width = w;
      ref.current.height = h;
    });
    const ctx = photoCanvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#2a2a3e";
      ctx.fillRect(0, 0, w, h);
    }
  }, []);

  const loadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = photoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const { w, h } = canvasSize;
      // cover: 캔버스 꽉 채우기
      const scale = Math.max(w / img.width, h / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
      const drawCtx = drawCanvasRef.current?.getContext("2d");
      if (drawCtx) drawCtx.clearRect(0, 0, w, h);
      setHasPhoto(true);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
    e.target.value = "";
  };

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = drawCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = (e as React.TouchEvent).touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    const me = e as React.MouseEvent;
    return { x: me.clientX - rect.left, y: me.clientY - rect.top };
  };

  const getDrawCtx = () => drawCanvasRef.current?.getContext("2d") ?? null;

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = getDrawCtx();
    if (!ctx) return;
    drawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = isEraser ? SIZES[sizeIdx].px * 4 : SIZES[sizeIdx].px;
    if (isEraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const moveDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = getDrawCtx();
    if (!ctx) return;
    const pos = getPos(e);
    if (lastPos.current && Math.hypot(pos.x - lastPos.current.x, pos.y - lastPos.current.y) > 60) return;
    lastPos.current = pos;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPos.current = null;
    const ctx = getDrawCtx();
    if (ctx) ctx.globalCompositeOperation = "source-over";
  };

  const getMergedCanvas = () => {
    const temp = document.createElement("canvas");
    temp.width = canvasSize.w;
    temp.height = canvasSize.h;
    const ctx = temp.getContext("2d")!;
    if (photoCanvasRef.current) ctx.drawImage(photoCanvasRef.current, 0, 0);
    if (drawCanvasRef.current) ctx.drawImage(drawCanvasRef.current, 0, 0);
    return temp;
  };

  const handleSave = () => {
    const temp = getMergedCanvas();
    const link = document.createElement("a");
    link.download = "wagie-photo-draw.png";
    link.href = temp.toDataURL("image/png");
    link.click();
  };

  const handleShare = () => {
    getMergedCanvas().toBlob(async (blob) => {
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
          <button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95 transition bg-white/15">📷 사진</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95 transition" style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>저장</button>
          <button onClick={handleShare} className="px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95 transition bg-white/15">공유</button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={loadPhoto} className="hidden" />

      {/* 캔버스 영역 */}
      <div ref={containerRef} className="flex-1 overflow-hidden p-2 relative">
        {!hasPhoto && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none z-10">
            <p className="text-4xl opacity-40">📷</p>
            <p className="text-white/30 text-sm">위에서 사진을 불러오세요</p>
          </div>
        )}
        {/* 사진 레이어 */}
        <canvas ref={photoCanvasRef} className="rounded-2xl absolute inset-2" style={{ width: "calc(100% - 16px)", height: "calc(100% - 16px)" }} />
        {/* 그림 레이어 */}
        <canvas
          ref={drawCanvasRef}
          className="rounded-2xl absolute inset-2 touch-none"
          style={{ width: "calc(100% - 16px)", height: "calc(100% - 16px)", cursor: isEraser ? "cell" : "crosshair" }}
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
