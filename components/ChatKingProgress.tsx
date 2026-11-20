"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/app/firebase";
import { apiFetch } from "@/lib/api-fetch";
import { flushChatKingMessages } from "@/lib/event-chat-document";
import { chatKingStatus } from "@/lib/chat-king";

type Status = ReturnType<typeof chatKingStatus>;

export default function ChatKingProgress() {
  const [status, setStatus] = useState<Status | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let loading = false;
    const load = async () => {
      if (loading || !auth.currentUser) return;
      loading = true;
      const uid = auth.currentUser.uid;
      try {
        await flushChatKingMessages();
        const response = await apiFetch("/api/events/chat-king", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw Error(data.error || "진행 상황을 불러오지 못했어.");
        if (!cancelled && auth.currentUser?.uid === uid) { setStatus(data); setError(""); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "진행 상황을 불러오지 못했어.");
      } finally { loading = false; }
    };
    const unsub = onAuthStateChanged(auth, user => {
      setSignedIn(Boolean(user));
      setStatus(null);
      setError("");
      if (user) void load();
    });
    const timer = window.setInterval(load, 30000);
    window.addEventListener("focus", load);
    window.addEventListener("online", load);
    return () => { cancelled = true; unsub(); window.clearInterval(timer); window.removeEventListener("focus", load); window.removeEventListener("online", load); };
  }, [retry]);

  return (
    <section aria-labelledby="event-progress" className="mt-6 rounded-2xl border border-sky-100 bg-sky-50/50 p-5">
      <h3 id="event-progress" className="font-semibold text-slate-800">나의 도전</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">2026년 12월 1일~10일 · 한국 시간 기준<br />1:1·단체·회의방에서 내가 보낸 메시지 합산</p>
      {signedIn === false ? <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-sky-700 underline underline-offset-4">로그인하고 진행 상황 보기</Link> : error ? (
        <div role="alert" className="mt-4 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 underline underline-offset-4">다시 시도</button></div>
      ) : !status ? <p role="status" className="mt-4 text-sm text-slate-500">진행 상황을 불러오는 중…</p> : (
        <>
          <p className="mt-4 text-xs font-semibold text-sky-700">{status.phase === "upcoming" ? "12월 1일부터 자동으로 집계돼요" : status.phase === "active" ? "이벤트 진행 중" : "이벤트 종료"}</p>
          <p className="mb-3 mt-2 text-2xl font-semibold tabular-nums text-slate-800">{status.count.toLocaleString("ko-KR")}<span className="ml-1 text-xs font-normal text-slate-500">/ 1,000,000개</span></p>
          <div role="progressbar" aria-label="채팅 미션 진행률" aria-valuemin={0} aria-valuemax={status.target} aria-valuenow={Math.min(status.count, status.target)} className="h-2 overflow-hidden rounded-full bg-sky-100"><div className="h-full rounded-full bg-sky-400 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${status.progress}%` }} /></div>
          {status.trialEndsAt ? (
            <div className="mt-4 rounded-xl bg-white p-3 text-sm leading-6 text-sky-900">
              <p className="font-semibold">{status.trialActive ? "달성 완료! 라이트 체험 중" : "라이트 무료 체험이 종료됐어요"}</p>
              <p>{new Date(status.trialEndsAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}까지</p>
            </div>
          ) : <p className="mt-3 text-xs leading-5 text-slate-500">100만 개 달성 시 라이트 20일 체험이 자동으로 시작돼요.<br />시스템 알림과 긴급회의 안내는 집계에서 제외돼요.</p>}
        </>
      )}
    </section>
  );
}
