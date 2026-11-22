"use client";
/* eslint-disable @next/next/no-img-element -- Chat image data URLs and uploaded media. */
import { useState } from "react";
import { createPortal } from "react-dom";
import { Forward, X, ChevronRight } from "lucide-react";
import { readBundle } from "@/lib/forwarded-messages";
import SpoilerMessage from "./SpoilerMessage";

export default function ForwardBundle({ items }: { items: unknown }) {
  const [open, setOpen] = useState(false);
  const messages = readBundle(items);
  if (!messages.length) return <span>전달된 메시지를 불러올 수 없어.</span>;
  return <>
    <button type="button" onClick={e => { e.stopPropagation(); setOpen(true); }} className="block w-60 max-w-full rounded-2xl bg-white text-slate-800 p-4 text-left shadow-sm">
      <span className="flex items-center gap-2 text-sky-600 text-xs font-semibold"><Forward size={15} />묶음 메시지 · {messages.length}개</span>
      <span className="block mt-3 font-semibold text-sm">{Array.from(new Set(messages.map(m => m.from))).slice(0, 3).join(", ")}의 대화</span>
      <span className="block text-xs text-slate-500 mt-2 truncate">{messages[0].spoiler ? "스포일러 메시지" : messages[0].type === "image" ? "사진" : messages[0].content}</span>
      <span className="flex items-center justify-between border-t mt-3 pt-3 text-xs text-slate-400">대화 펼쳐 보기<ChevronRight size={14} /></span>
    </button>
    {open && createPortal(<div className="fixed inset-0 z-[1000000] bg-slate-900/40 p-4 flex items-center justify-center" onClick={e => { e.stopPropagation(); setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label="전달된 대화" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Escape") setOpen(false); }} className="bg-white rounded-3xl w-full max-w-lg max-h-[85dvh] flex flex-col overflow-hidden shadow-2xl">
        <header className="flex justify-between items-center p-5 border-b"><h2 className="font-semibold">전달된 대화 · {messages.length}개</h2><button autoFocus type="button" aria-label="닫기" onClick={() => setOpen(false)}><X size={21} /></button></header>
        <div className="overflow-y-auto p-5 space-y-5">{messages.map((m, i) => <article key={i} className="text-slate-800"><div className="flex gap-2 items-center mb-2"><b className="text-sm">{m.from}</b>{m.sentAt > 0 && <time className="text-[10px] text-slate-400">{new Date(m.sentAt).toLocaleString("ko-KR")}</time>}</div>
          {m.spoiler ? <SpoilerMessage content={m.content}>{m.content}</SpoilerMessage> : m.type === "image" ? <img src={m.content} alt={`${m.from}의 사진`} className="max-w-full max-h-[60vh] rounded-xl object-contain" /> : <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>}
        </article>)}</div>
      </section>
    </div>, document.body)}
  </>;
}
