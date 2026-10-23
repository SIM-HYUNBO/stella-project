"use client";

import { useRef, useState } from "react";
import { AIMedia } from "@/lib/ai-media";
import { AIMediaPreview } from "./AIMediaPicker";

export default function AIUserMessage({ content, media, disabled, onSave, onDelete, tone }: {
  content: string; media?: AIMedia; disabled: boolean;
  onSave: (text: string) => Promise<void>; onDelete: () => Promise<void>;
  tone?: "sunny";
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const act = async (action: () => Promise<void>) => {
    if (disabled || pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try { await action(); setEditing(false); }
    catch { setError("저장하지 못했어. 다시 시도해 줘."); }
    finally { pending.current = false; setBusy(false); }
  };
  return <div className={`group ml-auto max-w-[85%] ${editing ? "w-full" : "w-fit"}`}>
    <div className={`rounded-[24px] rounded-br-lg px-4 py-3 text-[15px] leading-7 text-sky-950 ${tone === "sunny" ? "border border-sky-100 bg-gradient-to-br from-sky-50 to-sky-100/80" : "bg-sky-100"}`}>
      {media && <AIMediaPreview media={media} />}
      {editing ? <form onSubmit={e => { e.preventDefault(); if (draft.trim()) void act(() => onSave(draft.trim())); }}>
        <textarea autoFocus aria-label="메시지 수정" value={draft} disabled={busy || disabled} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Escape" && !busy) setEditing(false); }} rows={Math.min(8, Math.max(2, draft.split("\n").length))} className="block w-full resize-y bg-transparent text-[15px] leading-7 outline-none focus-visible:ring-1 focus-visible:ring-sky-300" />
        <p className="mt-2 text-[11px] leading-relaxed text-sky-700/70">수정하면 이 메시지 뒤 대화가 지워지고 AI가 다시 답해.</p>
        <div className="mt-3 flex justify-end gap-2 text-xs">
          <button type="button" disabled={busy} onClick={() => setEditing(false)} className="rounded-full px-3 py-2 text-slate-500 hover:bg-white/50">취소</button>
          <button type="submit" disabled={busy || disabled || !draft.trim()} className="rounded-full bg-white px-4 py-2 font-medium text-sky-700 disabled:opacity-40">{busy ? "저장 중…" : "완료"}</button>
        </div>
      </form> : <div role="button" tabIndex={0} aria-label="메시지 작업 메뉴" aria-expanded={actionsOpen} onClick={() => setActionsOpen(v => !v)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActionsOpen(v => !v); } }} className="whitespace-pre-wrap break-words outline-none focus-visible:ring-1 focus-visible:ring-sky-300">{content}</div>}
    </div>
    {!editing && <div className={`flex justify-end gap-1 pt-1 text-slate-300 transition-opacity ${actionsOpen ? "opacity-100" : "pointer-events-none opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-focus-within:pointer-events-auto"}`}>
      <button aria-label="메시지 수정" title="수정" disabled={busy || disabled} onClick={() => { setDraft(content); setError(""); setEditing(true); }} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-50 hover:text-slate-500 focus-visible:opacity-100 disabled:opacity-30"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 5 5-12 12-6 1 1-6L16 3ZM14 5l5 5" /></svg></button>
      <button aria-label="메시지 삭제" title="삭제" disabled={busy || disabled} onClick={() => void act(onDelete)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-50 hover:text-slate-500 disabled:opacity-30"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg></button>
    </div>}
    {error && <p role="alert" className="mt-1 text-xs text-red-500">{error}</p>}
  </div>;
}
