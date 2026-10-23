"use client";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

export default function AIGeneratedImage({ id, prompt }: { id: string; prompt: string }) {
  const [url, setUrl] = useState(""), [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setUrl(""); setError(false);
    const controller = new AbortController(); let objectUrl = "", active = true, started = false;
    const load = async () => {
      if (started) return; started = true; setError(false);
      try {
        const response = await apiFetch(`/api/ai-image?id=${encodeURIComponent(id)}`, { signal: controller.signal });
        if (!response.ok) throw Error();
        objectUrl = URL.createObjectURL(await response.blob());
        if (active) setUrl(objectUrl); else URL.revokeObjectURL(objectUrl);
      } catch { if (active) setError(true); }
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { observer?.disconnect(); void load(); } }, { rootMargin: "200px" });
    if (observer && container.current) observer.observe(container.current); else void load();
    return () => { active = false; observer?.disconnect(); controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, attempt]);
  return <div ref={container} className="my-3 w-full max-w-md overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
    {url ? <a href={url} target="_blank" rel="noreferrer" aria-label="생성 이미지 크게 보기"><img src={url} alt={prompt} className="aspect-square w-full object-contain" /></a> : <div className="flex aspect-square items-center justify-center bg-sky-50/60 text-sm text-slate-500">{error ? <button onClick={() => setAttempt(v => v + 1)} className="rounded-full bg-white px-4 py-2">이미지 다시 불러오기</button> : "그림을 불러오는 중…"}</div>}
    <div className="flex items-center justify-between gap-3 px-4 py-3"><span className="text-xs text-slate-400">AI로 만든 이미지</span>{url && <a href={url} download={`wagie-${id}.jpg`} className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5" /></svg>저장</a>}</div>
  </div>;
}
