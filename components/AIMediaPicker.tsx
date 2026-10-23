"use client";
import { useRef, useState } from "react";
import { AIMedia, prepareAIMedia } from "@/lib/ai-media";

export function AIMediaPreview({ media, onRemove }: { media: AIMedia; onRemove?: () => void }) {
  return <div className="mb-2 max-w-sm rounded-2xl border border-sky-100 bg-white p-2">
    <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-xs text-slate-500">{media.name}</span>{onRemove && <button type="button" aria-label="첨부 삭제" onClick={onRemove} className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100">✕</button>}</div>
    <div className="mt-1 flex gap-1">{media.frames.map((src, i) => <img key={i} src={src} alt={media.kind === "video" ? `동영상 대표 장면 ${i + 1}` : media.name} className="min-w-0 flex-1 rounded-lg object-contain" style={{ maxHeight: 160 }} />)}</div>
    {media.kind === "video" && <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{Math.round(media.duration || 0)}초 영상 · 대표 장면 3장만 분석해. 소리와 원본 영상은 전송·저장하지 않아.</p>}
  </div>;
}

export default function AIMediaPicker({ disabled, onChange, onBusy, onError, onCreateImage }: {
  disabled: boolean; onChange: (media: AIMedia) => void; onBusy: (busy: boolean) => void; onError: (error: string) => void;
  onCreateImage?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const choose = (accept: string) => { if (input.current) { input.current.accept = accept; input.current.click(); } setOpen(false); };
  return <div className="relative z-20 shrink-0">
    <button type="button" disabled={disabled} aria-label="사진 또는 동영상 첨부" aria-expanded={open} onClick={() => setOpen(v => !v)} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-sky-50 hover:text-sky-500 disabled:opacity-30"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></button>
    {open && <div className="absolute bottom-12 left-0 w-52 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl" onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}>
      <button type="button" disabled={disabled} onClick={() => choose("image/*")} className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 hover:bg-sky-50">사진 첨부</button>
      <button type="button" disabled={disabled} onClick={() => choose("video/*")} className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 hover:bg-sky-50">동영상 첨부</button>
      {onCreateImage && <button type="button" disabled={disabled} onClick={() => { setOpen(false); onCreateImage(); }} className="mt-1 flex w-full items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-left text-sm font-medium text-amber-800 hover:bg-amber-100"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="m3 16 5-5 5 5 3-3 5 5M15 6v4M13 8h4" /></svg>이미지 만들기</button>}
      <p className="px-3 py-2 text-[11px] text-slate-400">한 번에 파일 1개 · 영상 1분/50MB 이하<br />영상은 대표 장면 3장으로 분석</p>
    </div>}
    <input ref={input} type="file" hidden onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = "";
      if (!file || busy.current || disabled) return;
      busy.current = true; onBusy(true);
      try { onChange(await prepareAIMedia(file)); } catch (err) { onError(err instanceof Error ? err.message : "파일을 준비하지 못했어."); }
      finally { busy.current = false; onBusy(false); }
    }} />
  </div>;
}
