"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/app/firebase";
import { apiFetch } from "@/lib/api-fetch";
import { canUseAI } from "@/lib/membership";
import RobotWelcomeArt from "@/components/RobotWelcomeArt";

export default function AIMembershipGate({ study = false, children }: { study?: boolean; children: ReactNode }) {
  const [state, setState] = useState<"loading" | "login" | "allowed" | "denied" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      const request = ++generation;
      clearTimeout(expiryTimer);
      const user = auth.currentUser;
      if (!user) { setState("login"); return; }
      try {
        const response = await apiFetch("/api/membership", { cache: "no-store" });
        const membership = await response.json();
        if (!response.ok) throw Error(membership.error || "멤버십을 확인하지 못했어.");
        if (cancelled || request !== generation || auth.currentUser?.uid !== user.uid) return;
        const allowed = canUseAI(membership, study) && (!membership.expiresAt || membership.expiresAt > Date.now());
        setState(allowed ? "allowed" : "denied");
        if (allowed && membership.expiresAt) expiryTimer = setTimeout(() => { setState("loading"); void check(); }, Math.min(2147483647, Math.max(1, membership.expiresAt - Date.now())));
      } catch (e) {
        if (!cancelled && request === generation) { setError(e instanceof Error ? e.message : "멤버십을 확인하지 못했어."); setState("error"); }
      }
    };
    const unsub = onAuthStateChanged(auth, () => { setState("loading"); void check(); });
    const refresh = () => { void check(); };
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => { cancelled = true; unsub(); clearTimeout(expiryTimer); window.clearInterval(interval); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); };
  }, [study, retry]);

  if (state === "allowed") return <>{children}</>;
  return (
    <main className="flex min-h-screen flex-col bg-[#f7fbff] px-6 py-6 text-slate-800">
      <Link href={study ? "/robot" : "/home"} aria-label="돌아가기" className="flex h-11 w-11 items-center justify-center rounded-full border border-sky-100 bg-white text-slate-600">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m14 6-6 6 6 6" /></svg>
      </Link>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center pb-14 text-center">
        <div className="mb-7"><RobotWelcomeArt color="#38bdf8" compact /></div>
        {state === "loading" ? <p role="status" className="text-sm text-slate-500">멤버십 확인 중…</p> : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">{state === "login" ? "로그인하고 만나 봐" : state === "error" ? "연결을 확인해 줘" : study ? "학습용 AI는 프리미엄으로" : "AI와 함께하는 라이트"}</h1>
            <p className="mb-7 mt-4 text-sm leading-6 text-slate-500">{state === "login" ? "AI를 이용하려면 먼저 로그인해 줘." : state === "error" ? error : study ? "프리미엄 멤버십으로 일반 AI와 학습용 AI를 함께 이용할 수 있어." : "일반 AI는 라이트·프리미엄 멤버십 또는 유효한 라이트 무료 체험으로 이용할 수 있어."}</p>
            {state === "error" ? <button onClick={() => { setState("loading"); setRetry(value => value + 1); }} className="rounded-full bg-sky-500 px-7 py-3 text-sm font-semibold text-white">다시 시도</button> : <Link href={state === "login" ? "/login" : "/upgrade"} className="rounded-full bg-sky-500 px-7 py-3 text-sm font-semibold text-white">{state === "login" ? "로그인" : "멤버십 알아보기"}</Link>}
          </>
        )}
      </div>
    </main>
  );
}
