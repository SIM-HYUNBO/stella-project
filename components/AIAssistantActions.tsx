"use client";

import { useRef, useState } from "react";
import { ThumbsUp, ThumbsDown, RotateCcw, Copy, Check } from "lucide-react";

export default function AIAssistantActions({ content, feedback, disabled, onFeedback, onRetry, onError }: {
  content: string;
  feedback?: "like" | "dislike" | null;
  disabled: boolean;
  onFeedback: (value: "like" | "dislike" | null) => Promise<void>;
  onRetry: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const act = async (action: () => Promise<void>) => {
    if (lock.current || disabled) return;
    lock.current = true; setBusy(true);
    try { await action(); } catch { onError("처리하지 못했어. 잠시 후 다시 눌러 줘."); }
    finally { lock.current = false; setBusy(false); }
  };
  const button = "flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-sky-50 hover:text-sky-600 disabled:opacity-30";
  return <div className="mt-2 flex items-center gap-1" role="group" aria-label="AI 답변 도구">
    <button type="button" title="좋아요" aria-label="좋아요" aria-pressed={feedback === "like"} disabled={disabled || busy} className={button} onClick={() => act(() => onFeedback(feedback === "like" ? null : "like"))}><ThumbsUp size={17} strokeWidth={1.6} className={feedback === "like" ? "fill-sky-100 text-sky-600" : ""} /></button>
    <button type="button" title="싫어요" aria-label="싫어요" aria-pressed={feedback === "dislike"} disabled={disabled || busy} className={button} onClick={() => act(() => onFeedback(feedback === "dislike" ? null : "dislike"))}><ThumbsDown size={17} strokeWidth={1.6} className={feedback === "dislike" ? "fill-sky-100 text-sky-600" : ""} /></button>
    <button type="button" title="다시 시도" aria-label="다시 시도" disabled={disabled || busy} className={button} onClick={() => act(onRetry)}><RotateCcw size={17} strokeWidth={1.6} className={busy ? "animate-spin" : ""} /></button>
    <button type="button" title={copied ? "복사됨" : "복사"} aria-label={copied ? "복사됨" : "복사"} disabled={disabled || busy} className={button} onClick={() => act(async () => { await navigator.clipboard.writeText(content); setCopied(true); })}>{copied ? <Check size={17} strokeWidth={1.6} /> : <Copy size={17} strokeWidth={1.6} />}</button>
  </div>;
}
