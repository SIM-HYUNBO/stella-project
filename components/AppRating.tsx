"use client";

import { useEffect, useState } from "react";
import { auth } from "@/app/firebase";

export default function AppRating({ uid }: { uid: string }) {
  const [rating, setRating] = useState(0);
  const [saved, setSaved] = useState(0);
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setRating(0); setSaved(0); setLoading(true); setLoadFailed(false); setError(""); setThanks(false);
    void (async () => {
      try {
        const user = auth.currentUser;
        if (!user || user.uid !== uid) throw Error();
        const response = await fetch("/api/app-rating", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store", signal: controller.signal });
        if (!response.ok) throw Error();
        const data = await response.json();
        if (!controller.signal.aborted) { setRating(data.rating || 0); setSaved(data.rating || 0); }
      } catch {
        if (!controller.signal.aborted) { setError("평가를 불러오지 못했어요."); setLoadFailed(true); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [uid, retry]);

  const submit = async () => {
    if (!rating || saving || loading || loadFailed || rating === saved) return;
    setSaving(true); setError(""); setThanks(false);
    try {
      const user = auth.currentUser;
      if (!user || user.uid !== uid) throw Error("다시 로그인해 주세요.");
      const response = await fetch("/api/app-rating", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ rating }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "평가를 저장하지 못했어요.");
      setSaved(data.rating); setThanks(true);
    } catch (e) { setError(e instanceof Error ? e.message : "평가를 저장하지 못했어요. 다시 시도해 주세요."); }
    finally { setSaving(false); }
  };

  return (
    <section aria-labelledby="app-rating-title" className="rounded-[20px] border border-sky-100 bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="app-rating-title" className="text-sm font-black text-slate-700">와기를 평가해 주세요</h2>
          <p className="mt-1 text-xs text-slate-400">와기는 어땠나요? 별점으로 알려 주세요.</p>
        </div>
        <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700">{rating ? `${rating} / 5` : "내 별점"}</span>
      </div>
      <fieldset disabled={loading || saving || loadFailed} className="mt-3 flex gap-1" onMouseLeave={() => setHover(0)}>
        <legend className="sr-only">와기 별점 선택</legend>
        {[1, 2, 3, 4, 5].map(star => (
          <label key={star} className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl transition hover:bg-yellow-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sky-400">
            <input type="radio" name="wagie-rating" value={star} checked={rating === star} className="sr-only" aria-label={`${star}점`} onChange={() => { setRating(star); setThanks(false); setError(""); }} onFocus={() => setHover(0)} />
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 transition-colors" onMouseEnter={() => setHover(star)} fill={star <= (hover || rating) ? "#facc15" : "#f1f5f9"} stroke={star <= (hover || rating) ? "#eab308" : "#cbd5e1"} strokeWidth="1.4" strokeLinejoin="round"><path d="m12 2.8 2.8 5.7 6.3.9-4.5 4.4 1.1 6.2-5.7-3-5.7 3 1.1-6.2-4.5-4.4 6.3-.9L12 2.8Z" /></svg>
          </label>
        ))}
      </fieldset>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className={`text-xs ${error ? "text-red-500" : "text-slate-400"}`}>{error || (loading ? "내 평가를 불러오는 중…" : thanks ? "평가 고마워요! 🐥" : saved ? "별점을 바꾸고 다시 저장할 수 있어요." : "선택한 별점은 와기 안에 저장돼요.")}</p>
        {loadFailed ? <button type="button" onClick={() => setRetry(value => value + 1)} className="rounded-full bg-sky-50 px-4 py-2 text-xs font-bold text-sky-600">다시 시도</button> : <button type="button" onClick={submit} disabled={!rating || rating === saved || loading || saving} className="rounded-full bg-sky-100 px-4 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-200 disabled:opacity-40">{saving ? "저장 중…" : saved ? "평가 수정" : "평가 남기기"}</button>}
      </div>
    </section>
  );
}
