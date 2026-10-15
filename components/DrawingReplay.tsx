"use client";

import { useEffect, useRef, useState } from "react";
import { DrawingStroke, paintDrawingPoint, validDrawing } from "@/lib/drawing-replay";

export default function DrawingReplay({ src, strokes, onExpand }: { src: string; strokes: DrawingStroke[]; onExpand: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [run, setRun] = useState(0);
  const currentStrokes = useRef(strokes);
  currentStrokes.current = strokes;
  const drawingKey = JSON.stringify(strokes);
  useEffect(() => {
    const data = currentStrokes.current;
    if (!validDrawing(data) || !canvas.current || !container.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0, started = false;
    const play = () => {
      if (started) return;
      started = true; setPlaying(true);
      const context = canvas.current?.getContext("2d"); if (!context) { setPlaying(false); return; }
      context.fillStyle = "#ffffff"; context.fillRect(0, 0, 900, 600);
      const total = data.reduce((sum, stroke) => sum + stroke.points.length, 0);
      const duration = Math.min(8000, Math.max(1200, total * 12));
      let start = -1, painted = 0, strokeIndex = 0, pointIndex = 0;
      const tick = (time: number) => {
        if (start < 0) start = time;
        const target = Math.min(total, Math.ceil((time - start) / duration * total));
        while (painted < target) {
          paintDrawingPoint(context, data[strokeIndex], pointIndex);
          painted++; pointIndex++;
          if (pointIndex >= data[strokeIndex].points.length) { strokeIndex++; pointIndex = 0; }
        }
        if (painted < total) frame = requestAnimationFrame(tick);
        else setPlaying(false);
      };
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { play(); observer.disconnect(); } });
    observer.observe(container.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [drawingKey, run]);

  return <div ref={container} className="relative w-[220px] max-w-full">
    <div onClick={event => { event.stopPropagation(); onExpand(); }} className="relative cursor-pointer overflow-hidden rounded-2xl">
      <img src={src} alt="움직이는 손글씨" className={`w-full ${playing ? "invisible" : ""}`} />
      <canvas ref={canvas} width={900} height={600} aria-hidden="true" className={`absolute inset-0 h-full w-full ${playing ? "" : "invisible"}`} />
    </div>
    <button type="button" aria-label="손글씨 다시 재생" title="다시 재생" onClick={event => { event.stopPropagation(); setRun(value => value + 1); }}
      className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10a9 9 0 1 1 2 9M3 4v6h6"/></svg>
    </button>
  </div>;
}
