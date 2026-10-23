"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function AIImageComposer({ onClose, onGenerate }: { onClose: () => void; onGenerate: (prompt: string, id: string) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null), request = useRef<string | null>(null), pending = useRef(false);
  const [prompt, setPrompt] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  return createPortal(<dialog ref={dialog} aria-label="이미지 만들기" onCancel={e => { e.preventDefault(); if (!pending.current) onClose(); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-[28px] border border-amber-100 bg-white p-6 text-slate-700 shadow-2xl backdrop:bg-slate-900/25">
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">어떤 그림을 만들까?</h2><button aria-label="이미지 만들기 닫기" disabled={busy} onClick={onClose} className="h-9 w-9 rounded-full bg-sky-50 text-slate-500 disabled:opacity-30">✕</button></div>
    <p className="mt-2 text-sm leading-relaxed text-slate-500">장면, 색감, 그림체를 자유롭게 설명해 줘.</p>
    <form onSubmit={async e => {
      e.preventDefault(); if (pending.current || !prompt.trim()) return;
      pending.current = true; setBusy(true); setError(""); request.current ||= crypto.randomUUID();
      try { await onGenerate(prompt.trim(), request.current); onClose(); }
      catch (e) { setError(e instanceof Error ? e.message : "이미지를 만들지 못했어. 다시 시도해 줘."); }
      finally { pending.current = false; setBusy(false); }
    }}>
      <textarea autoFocus aria-label="만들 이미지 설명" value={prompt} disabled={busy} maxLength={2000} onChange={e => { setPrompt(e.target.value); request.current = null; setError(""); }} placeholder="예: 노란 우비를 입은 하늘색 오리가 비 오는 골목을 걷는 따뜻한 수채화" rows={5} className="mt-5 w-full resize-y rounded-2xl border border-sky-100 bg-sky-50/50 p-4 text-sm leading-relaxed outline-none focus:border-sky-300 disabled:opacity-60" />
      <div className="mt-2 flex justify-between gap-3 text-[11px] text-slate-400"><span>한 번에 1장 · 이미지 생성은 별도 사용료가 발생해.</span><span>{prompt.length}/2000</span></div>
      {error && <div role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-600">{error}<button type="button" onClick={() => { request.current = null; setError(""); }} className="mt-2 block underline">새 이미지 요청으로 시작하기</button></div>}
      <button type="submit" disabled={busy || !prompt.trim()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-40">{busy ? <><span className="h-2 w-2 animate-pulse rounded-full bg-amber-200" />그림을 만들고 있어…</> : "이미지 만들기"}</button>
      {busy && <p role="status" className="mt-3 text-center text-xs text-slate-400">완성되면 지금 대화에 저장돼. 잠깐만 기다려 줘.</p>}
    </form>
  </dialog>, document.body);
}
