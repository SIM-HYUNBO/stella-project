"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AnimatedSticker from "./AnimatedSticker";
import useCustomStickers from "@/app/hooks/useCustomStickers";
import { CustomSticker, MAX_STICKER_IMAGE, MAX_STICKERS, StickerMotion, STICKER_MOTIONS } from "@/lib/custom-stickers";

const COLORS = ["#263244", "#f472b6", "#fb923c", "#facc15", "#34d399", "#38bdf8", "#a78bfa", "#ffffff"];

function Studio({ onClose, onSend }: { onClose: () => void; onSend?: (sticker: CustomSticker) => Promise<void> }) {
  const { stickers, ready, error: loadError, save, remove } = useCustomStickers();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<number | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const undo = useRef<ImageData[]>([]);
  const busyRef = useRef(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(12);
  const [eraser, setEraser] = useState(false);
  const [preview, setPreview] = useState("");
  const [motion, setMotion] = useState<StickerMotion>("bounce");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const remember = () => {
    const canvas = canvasRef.current, context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    undo.current = [...undo.current.slice(-19), context.getImageData(0, 0, canvas.width, canvas.height)];
    setHistoryCount(undo.current.length);
  };
  const updatePreview = () => {
    const canvas = canvasRef.current, context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let drawn = false;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) { drawn = true; break; }
    setPreview(drawn ? canvas.toDataURL("image/png") : "");
  };
  const position = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget, rect = canvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null;
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  };
  const draw = (event: React.PointerEvent<HTMLCanvasElement>, dot = false) => {
    const context = event.currentTarget.getContext("2d"), point = position(event);
    if (!point) { last.current = null; return; }
    if (!context) return;
    context.save();
    context.globalCompositeOperation = eraser ? "destination-out" : "source-over";
    context.strokeStyle = color; context.fillStyle = color;
    context.lineWidth = eraser ? size * 3 : size;
    context.lineCap = "round"; context.lineJoin = "round";
    context.beginPath();
    if (dot) { context.arc(point.x, point.y, context.lineWidth / 2, 0, Math.PI * 2); context.fill(); }
    else { context.moveTo(last.current?.x ?? point.x, last.current?.y ?? point.y); context.lineTo(point.x, point.y); context.stroke(); }
    context.restore(); last.current = point;
  };
  const end = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null; last.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    updatePreview();
  };
  const makeSticker = (): CustomSticker => {
    const canvas = canvasRef.current;
    if (!canvas || !preview) throw Error("먼저 이모티콘을 그려 줘.");
    for (const width of [384, 256, 192, 128]) {
      const output = document.createElement("canvas"); output.width = width; output.height = width;
      const context = output.getContext("2d"); if (!context) throw Error("그림을 만들지 못했어.");
      context.drawImage(canvas, 0, 0, width, width);
      const image = output.toDataURL("image/png");
      if (image.length <= MAX_STICKER_IMAGE) return { id: crypto.randomUUID(), name: name.trim() || "내 이모티콘", image, motion };
    }
    throw Error("그림이 너무 복잡해. 조금 단순하게 그려 줘.");
  };
  const action = async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(""); setNotice("");
    try { await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : "저장하거나 보내지 못했어. 다시 눌러 줘."); }
    finally { busyRef.current = false; setBusy(false); }
  };

  return <div className="min-h-full bg-[#f8fafc] text-slate-700">
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
      <button aria-label="이모티콘 공방 닫기" disabled={busy} onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 disabled:opacity-40"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m14 6-6 6 6 6" /></svg></button>
      <h1 className="text-base font-bold">이모티콘 공방</h1><span className="w-9" />
    </header>
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 pb-12">
      <div><p className="text-xl font-bold text-slate-800">내가 그린 그림이 움직여!</p><p className="mt-1 text-sm text-slate-400">그림을 그리고, 움직임을 골라 채팅에 보내 봐.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-3xl border border-slate-100 bg-white p-4">
          <div className="relative mx-auto aspect-square w-full max-w-[384px] overflow-hidden rounded-2xl" style={{ backgroundImage: "conic-gradient(#eef2f6 25%,white 0 50%,#eef2f6 0 75%,white 0)", backgroundSize: "20px 20px" }}>
            {!preview && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">여기에 직접 그려 봐</span>}
            <canvas ref={canvasRef} width={384} height={384} aria-label="이모티콘 그림판" className="relative h-full w-full touch-none"
              onPointerDown={event => { if (busy || pointer.current !== null || event.button !== 0) return; event.preventDefault(); remember(); pointer.current = event.pointerId; last.current = null; event.currentTarget.setPointerCapture(event.pointerId); draw(event, true); }}
              onPointerMove={event => { if (pointer.current === event.pointerId) draw(event); }}
              onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">{COLORS.map(item => <button key={item} aria-label={`${item} 펜 색`} aria-pressed={color === item && !eraser} disabled={busy}
            onClick={() => { setColor(item); setEraser(false); }} className="h-7 w-7 rounded-full border border-slate-200" style={{ background: item, outline: color === item && !eraser ? "2px solid #94a3b8" : undefined, outlineOffset: 2 }} />)}</div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {[6, 12, 22].map(width => <button key={width} disabled={busy} aria-label={`펜 굵기 ${width}`} aria-pressed={size === width} onClick={() => setSize(width)} className={`flex h-9 w-9 items-center justify-center rounded-xl ${size === width ? "bg-sky-100" : "bg-slate-50"}`}><span className="rounded-full bg-slate-600" style={{ width: width / 2, height: width / 2 }} /></button>)}
            <button disabled={busy} aria-pressed={eraser} onClick={() => setEraser(!eraser)} className={`rounded-xl px-3 py-2 text-xs ${eraser ? "bg-sky-100" : "bg-slate-50"}`}>지우개</button>
            <button disabled={busy || !historyCount} onClick={() => { const previous = undo.current.pop(); if (previous) canvasRef.current?.getContext("2d")?.putImageData(previous, 0, 0); setHistoryCount(undo.current.length); updatePreview(); }} className="rounded-xl bg-slate-50 px-3 py-2 text-xs disabled:opacity-30">되돌리기</button>
            <button disabled={busy || !preview} onClick={() => { remember(); canvasRef.current?.getContext("2d")?.clearRect(0, 0, 384, 384); updatePreview(); }} className="rounded-xl bg-slate-50 px-3 py-2 text-xs disabled:opacity-30">비우기</button>
          </div>
        </section>
        <section className="flex flex-col rounded-3xl border border-slate-100 bg-white p-5">
          <h2 className="text-xs font-semibold text-slate-400">움직임 미리보기</h2>
          <div className="flex min-h-[180px] flex-1 items-center justify-center">{preview ? <AnimatedSticker src={preview} motion={motion} /> : <span className="text-sm text-slate-300">그림을 그리면 여기에서 움직여</span>}</div>
          <div className="grid grid-cols-3 gap-2">{STICKER_MOTIONS.map(item => <button key={item.id} disabled={busy} aria-pressed={motion === item.id} onClick={() => setMotion(item.id)} className={`rounded-xl px-2 py-2.5 text-xs ${motion === item.id ? "bg-sky-100 font-bold text-sky-700" : "bg-slate-50 text-slate-500"}`}>{item.label}</button>)}</div>
          <input value={name} disabled={busy} maxLength={24} onChange={event => setName(event.target.value)} aria-label="이모티콘 이름" placeholder="이모티콘 이름" className="mt-4 rounded-xl border border-slate-100 px-3 py-3 text-sm outline-none focus:border-sky-300" />
          <div className="mt-3 flex gap-2">
            <button disabled={busy || !ready || !preview || !!loadError} onClick={() => action(async () => { await save(makeSticker()); setNotice("내 이모티콘에 저장했어!"); })} className="flex-1 rounded-xl bg-sky-100 py-3 text-sm font-semibold text-sky-700 disabled:opacity-40">저장</button>
            {onSend && <button disabled={busy || !preview} onClick={() => action(() => onSend(makeSticker()))} className="flex-1 rounded-xl bg-sky-400 py-3 text-sm font-semibold text-white disabled:opacity-40">보내기</button>}
          </div>
        </section>
      </div>
      {(error || loadError) && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">{error || loadError}</p>}
      {notice && <p role="status" className="text-center text-sm text-sky-600">{notice}</p>}
      <section><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">내 이모티콘</h2><span className="text-xs text-slate-400">{stickers.length}/{MAX_STICKERS}</span></div>
        {!ready ? <p className="text-sm text-slate-400">이모티콘 불러오는 중…</p> : !stickers.length ? <p className="rounded-2xl bg-white p-5 text-sm text-slate-400">첫 이모티콘을 저장해 봐. 채팅방 + 메뉴에서도 꺼내 쓸 수 있어.</p> :
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{stickers.map(sticker => <div key={sticker.id} className="relative rounded-2xl border border-slate-100 bg-white p-3 text-center">
            <button aria-label={`${sticker.name} 삭제`} disabled={busy} onClick={() => { if (confirm(`${sticker.name}을 내 이모티콘에서 지울까? 보낸 메시지는 남아 있어.`)) action(() => remove(sticker.id)); }} className="absolute right-2 top-2 z-10 rounded-full px-2 py-1 text-xs text-slate-400">✕</button>
            <AnimatedSticker src={sticker.image} motion={sticker.motion} small name={sticker.name} />
            <p className="truncate text-xs text-slate-500">{sticker.name}</p>
            {onSend && <button disabled={busy} onClick={() => action(() => onSend(sticker))} className="mt-2 w-full rounded-lg bg-sky-50 py-2 text-xs font-semibold text-sky-600 disabled:opacity-40">보내기</button>}
          </div>)}</div>}
      </section>
    </main>
  </div>;
}

export default function StickerStudio(props: { onClose: () => void; onSend?: (sticker: CustomSticker) => Promise<void> }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialogRef.current?.showModal(); }, []);
  return createPortal(<dialog ref={dialogRef} aria-label="이모티콘 공방" onCancel={event => { event.preventDefault(); props.onClose(); }}
    className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none overflow-y-auto border-0 p-0 backdrop:bg-black/30">
    <Studio {...props} />
  </dialog>, document.body);
}
