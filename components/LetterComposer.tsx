"use client";

import { useEffect, useRef, useState } from "react";
import { STICKERS } from "@/lib/room";

type Friend = { uid: string; nickname: string };
export default function LetterComposer({ friends, onClose, onSend }: {
  friends: Friend[]; onClose: () => void;
  onSend: (draft: { id: string; toUid: string; image: string; text: string; unlockAt: number }) => Promise<void>;
}) {
  const ink = useRef<HTMLCanvasElement>(null);
  const photo = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<number | null>(null);
  const previous = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);
  const id = useRef("");
  const fileSequence = useRef(0);
  const [recipient, setRecipient] = useState(friends[0]?.uid || "");
  const [text, setText] = useState("");
  const [color, setColor] = useState("#66546d");
  const [tool, setTool] = useState("pen");
  const [stamp, setStamp] = useState("🌼");
  const [schedule, setSchedule] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");
  const [hasInk, setHasInk] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  useEffect(() => { id.current = crypto.randomUUID(); const sequence = fileSequence; return () => { sequence.current++; }; }, []);
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) * 800 / r.width, y: (e.clientY - r.top) * 600 / r.height };
  };
  const begin = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (busy || pointer.current !== null || !e.isPrimary || e.button !== 0) return;
    const ctx = ink.current?.getContext("2d"); if (!ctx) return;
    history.current.push(ctx.getImageData(0, 0, 800, 600));
    if (history.current.length > 12) history.current.shift();
    const p = point(e); previous.current = p; pointer.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    if (tool === "stamp") {
      ctx.font = "64px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(stamp, p.x, p.y);
    } else {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, tool === "eraser" ? 16 : 3, 0, Math.PI * 2); ctx.fill();
    }
    setHasInk(true);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current !== e.pointerId || !previous.current || tool === "stamp") return;
    const ctx = ink.current?.getContext("2d"); if (!ctx) return;
    const p = point(e);
    ctx.lineWidth = tool === "eraser" ? 32 : 6; ctx.lineCap = "round"; ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(previous.current.x, previous.current.y); ctx.lineTo(p.x, p.y); ctx.stroke(); previous.current = p;
  };
  const end = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null; previous.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const undo = () => { const last = history.current.pop(); if (last) ink.current?.getContext("2d")?.putImageData(last, 0, 0); };
  const loadPhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 15000000) { setError("15MB 이하의 사진을 골라 줘."); return; }
    const seq = ++fileSequence.current;
    setPhotoBusy(true); setError("");
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      if (seq !== fileSequence.current) return;
      const ctx = photo.current?.getContext("2d"); if (!ctx) return;
      ctx.clearRect(0, 0, 800, 600);
      const ratio = Math.min(800 / img.width, 600 / img.height);
      const w = img.width * ratio, h = img.height * ratio;
      ctx.drawImage(img, (800 - w) / 2, (600 - h) / 2, w, h); setHasPhoto(true);
    } catch { if (seq === fileSequence.current) setError("사진을 열지 못했어. JPG나 PNG 사진으로 다시 골라 줘."); }
    finally { URL.revokeObjectURL(url); if (seq === fileSequence.current) setPhotoBusy(false); }
  };
  const send = async () => {
    if (busy || photoBusy || !recipient || (!hasInk && !hasPhoto && !text.trim())) return;
    const unlockAt = schedule ? new Date(schedule).getTime() : Date.now();
    if (!Number.isFinite(unlockAt) || (schedule && unlockAt < Date.now()) || unlockAt > Date.now() + 30 * 86400000) { setError("열리는 시간은 지금부터 30일 안으로 정해 줘."); return; }
    setBusy(true); setError("");
    try {
      const canvas = document.createElement("canvas"); canvas.width = 800; canvas.height = 600;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fffcf5"; ctx.fillRect(0, 0, 800, 600);
      if (photo.current) ctx.drawImage(photo.current, 0, 0);
      if (ink.current) ctx.drawImage(ink.current, 0, 0);
      let image = canvas.toDataURL("image/jpeg", 0.8);
      if (image.length > 640000) image = canvas.toDataURL("image/jpeg", 0.5);
      if (image.length > 640000) throw new Error("그림이 너무 커. 사진을 빼거나 더 간단하게 그려 줘.");
      await onSend({ id: id.current, toUid: recipient, text, image, unlockAt });
    } catch (e) { setError(e instanceof Error ? e.message : "전송하지 못했어. 다시 시도해 줘."); }
    finally { setBusy(false); }
  };
  return <div className="flex max-h-[90dvh] flex-col overflow-y-auto rounded-3xl bg-[#fffcf5] p-5 text-slate-700">
    <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">친구에게 낙서 편지</h2><button disabled={busy} aria-label="편지 쓰기 닫기" onClick={onClose}>✕</button></div>
    <label className="text-xs">받을 친구<select disabled={busy} value={recipient} onChange={e => setRecipient(e.target.value)} className="mb-3 mt-1 block w-full rounded-xl border border-amber-100 bg-white p-3">{friends.map(f => <option key={f.uid} value={f.uid}>{f.nickname}</option>)}</select></label>
    {!friends.length && <p className="mb-3 text-sm">친구를 추가하면 편지를 보낼 수 있어.</p>}
    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-2xl border border-amber-200 bg-[#fffcf5]">
      <canvas ref={photo} width={800} height={600} className="absolute inset-0 h-full w-full" />
      <canvas ref={ink} width={800} height={600} aria-label="낙서할 종이" className="absolute inset-0 h-full w-full touch-none" onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={() => { pointer.current = null; previous.current = null; }} />
    </div>
    <fieldset disabled={busy} className="mt-3 flex flex-wrap items-center gap-2 text-xs">
      {[["pen", "펜"], ["eraser", "지우개"], ["stamp", "스티커"]].map(([v, label]) => <button key={v} aria-pressed={tool === v} onClick={() => setTool(v)} className={`rounded-xl px-3 py-2 ${tool === v ? "bg-rose-100 text-rose-700" : "bg-white"}`}>{label}</button>)}
      <button onClick={undo} className="rounded-xl bg-white px-3 py-2">되돌리기</button>
      <label className="cursor-pointer rounded-xl bg-white px-3 py-2">{photoBusy ? "사진 준비 중…" : "사진 넣기"}<input type="file" accept="image/*" className="sr-only" onChange={e => { void loadPhoto(e.target.files?.[0]); e.target.value = ""; }} /></label>
      {hasPhoto && <button onClick={() => { photo.current?.getContext("2d")?.clearRect(0, 0, 800, 600); setHasPhoto(false); }}>사진 빼기</button>}
      {tool === "stamp" ? STICKERS.map(s => <button key={s} aria-pressed={s === stamp} onClick={() => setStamp(s)} className={`rounded-lg p-2 text-lg ${s === stamp ? "bg-rose-100" : ""}`}>{s}</button>) : ["#66546d", "#df8190", "#699ab5", "#7b9b77", "#d6ab4d"].map(c => <button key={c} aria-label={`펜 색상 ${c}`} aria-pressed={color === c} onClick={() => { setColor(c); setTool("pen"); }} className={`h-7 w-7 rounded-full ${color === c ? "ring-2 ring-rose-300 ring-offset-2" : ""}`} style={{ background: c }} />)}
    </fieldset>
    <label className="mt-4 text-xs">한마디<textarea disabled={busy} value={text} onChange={e => setText(e.target.value)} maxLength={1000} placeholder="그림에 다 못 담은 말을 적어 줘" className="mt-1 block min-h-20 w-full rounded-xl border border-amber-100 bg-white p-3 text-sm" /></label>
    <label className="mt-3 text-xs">열리는 시간 · 비우면 바로 열 수 있어<input disabled={busy} type="datetime-local" value={schedule} onChange={e => setSchedule(e.target.value)} className="mt-1 block w-full rounded-xl border border-amber-100 bg-white p-3" /></label>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    <button onClick={send} disabled={busy || photoBusy || !recipient || (!hasInk && !hasPhoto && !text.trim())} className="mt-4 rounded-2xl bg-[#b97981] py-3 font-bold text-white disabled:opacity-40">{busy ? "봉투를 보내는 중…" : "봉투에 담아 보내기"}</button>
  </div>;
}
