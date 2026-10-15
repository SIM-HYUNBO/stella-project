"use client";

import { useRef, useState, useEffect } from "react";
import { DrawingPoint, DrawingStroke, packDrawing, paintDrawingPoint } from "@/lib/drawing-replay";

const COLORS = [
  "#1a1a1a", "#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f97316",
];
const SIZES = [
  { label: "S", px: 3 },
  { label: "M", px: 7 },
  { label: "L", px: 14 },
];

type Props = {
  onSend: (dataUrl: string, strokes?: DrawingStroke[]) => void | Promise<void>;
  onClose: () => void;
  accentFrom?: string;
  accentTo?: string;
};

export default function DrawingCanvas({
  onSend,
  onClose,
  accentFrom = "#38bdf8",
  accentTo = "#818cf8",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState("#1a1a1a");
  const [sizeIdx, setSizeIdx] = useState(1);
  const [isEraser, setIsEraser] = useState(false);
  const drawing = useRef<number | null>(null);
  const strokes = useRef<DrawingStroke[]>([]);
  const activeStroke = useRef<DrawingStroke | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>): DrawingPoint | null => {
    const canvas = e.currentTarget, rect = canvas.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return null;
    return { x: Math.round((e.clientX - rect.left) * canvas.width / rect.width), y: Math.round((e.clientY - rect.top) * canvas.height / rect.height) };
  };
  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (sending || drawing.current !== null || e.button !== 0) return;
    const pos = getPos(e), ctx = e.currentTarget.getContext("2d"); if (!pos || !ctx) return;
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = e.pointerId; lastPos.current = pos;
    activeStroke.current = { color: isEraser ? "#ffffff" : color, width: SIZES[sizeIdx].px * (isEraser ? 4 : 1), points: [pos] };
    paintDrawingPoint(ctx, activeStroke.current, 0);
  };
  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current !== e.pointerId || !activeStroke.current) return;
    const ctx = e.currentTarget.getContext("2d"), pos = getPos(e);
    if (!ctx) return;
    if (!pos) { endDraw(e); return; }
    if (lastPos.current && Math.hypot(pos.x - lastPos.current.x, pos.y - lastPos.current.y) < 2) return;
    activeStroke.current.points.push(pos);
    paintDrawingPoint(ctx, activeStroke.current, activeStroke.current.points.length - 1);
    lastPos.current = pos;
  };
  const endDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current !== e.pointerId) return;
    if (activeStroke.current) strokes.current.push(activeStroke.current);
    activeStroke.current = null; drawing.current = null; lastPos.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const send = async () => {
    if (sending) return;
    if (!strokes.current.length) { setError("먼저 손글씨를 써 줘."); return; }
    setSending(true); setError("");
    try { await onSend(canvasRef.current?.toDataURL("image/png") || "", packDrawing(strokes.current)); }
    catch (e) { setError(e instanceof Error ? e.message : "보내지 못했어. 다시 눌러 줘."); }
    finally { setSending(false); }
  };

  const clearCanvas = () => {
    if (sending) return;
    strokes.current = []; activeStroke.current = null; drawing.current = null; lastPos.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-gray-100">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-xl border-b border-gray-100 shrink-0">
        <button onClick={onClose} disabled={sending}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90 transition text-lg font-bold">
          ✕
        </button>
        <span className="font-black text-slate-800 text-sm flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          손글씨
        </span>
        <button onClick={send} disabled={sending}
          className="px-4 py-2 rounded-full text-white text-sm font-black active:scale-95 transition shadow-md"
          style={{ background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})`, boxShadow: `0 4px 16px ${accentFrom}50` }}>
          {sending ? "보내는 중…" : "전송"}
        </button>
      </div>

      {/* 캔버스 */}
      <div className="flex-1 overflow-hidden p-3 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={900}
          height={600}
          className="rounded-2xl bg-white shadow-xl w-full touch-none"
          style={{ maxHeight: "100%", objectFit: "contain", cursor: isEraser ? "cell" : "crosshair" }}
          onPointerDown={startDraw} onPointerMove={draw} onPointerUp={endDraw} onPointerCancel={endDraw} onLostPointerCapture={endDraw}
        />
      </div>

      {error && <p role="alert" className="bg-red-50 px-4 py-2 text-xs text-red-500">{error}</p>}
      {/* 툴바 */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-5 py-3">
        <div className="flex items-center justify-between">
          {/* 색상 팔레트 */}
          <div className="flex gap-2.5 items-center">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setIsEraser(false); }}
                className="rounded-full transition-all"
                style={{
                  width: color === c && !isEraser ? 28 : 22,
                  height: color === c && !isEraser ? 28 : 22,
                  background: c,
                  boxShadow: color === c && !isEraser ? `0 0 0 3px white, 0 0 0 5px ${c}` : "0 1px 4px rgba(0,0,0,0.2)",
                }}
              />
            ))}
          </div>

          {/* 지우개 + 전체 지우기 */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsEraser((p) => !p)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition ${isEraser ? "bg-sky-100 ring-2 ring-sky-400" : "bg-gray-100"}`}
              title="지우개">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isEraser ? "#38bdf8" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 20H7L3 16l10-10 7 7-2.5 2.5"/><path d="M6.0 11.0 L13 18"/>
              </svg>
            </button>
            <button
              onClick={clearCanvas}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-red-100 transition"
              title="전체 지우기">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>

        {/* 펜 굵기 */}
        <div className="flex gap-2 mt-3 justify-center">
          {SIZES.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setSizeIdx(i)}
              className={`flex items-center justify-center w-12 h-9 rounded-xl transition ${sizeIdx === i ? "bg-sky-50 ring-1 ring-sky-400" : "bg-gray-50"}`}>
              <div
                className="rounded-full"
                style={{
                  width: Math.min(s.px * 1.6, 18),
                  height: Math.min(s.px * 1.6, 18),
                  background: isEraser ? "#cbd5e1" : color,
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
