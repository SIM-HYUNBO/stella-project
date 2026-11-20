"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/app/firebase";
import { apiFetch } from "@/lib/api-fetch";

export default function LightTrialNotice() {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let cancelled = false;
    const unsub = onAuthStateChanged(auth, async user => {
      setEndsAt(null);
      if (!user) return;
      try {
        const response = await apiFetch("/api/events/chat-king", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled && response.ok && auth.currentUser?.uid === user.uid) setEndsAt(data.trialEndsAt || null);
      } catch { /* The event page provides a retryable detailed status. */ }
    });
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { cancelled = true; unsub(); window.clearInterval(timer); };
  }, []);
  if (!endsAt || now >= endsAt) return null;
  return <p role="status" className="mt-5 rounded-2xl border border-sky-200/20 bg-sky-200/10 px-4 py-3 text-sm leading-6 text-sky-100">채팅의 왕 보상 · 라이트 무료 체험 중<br /><span className="text-xs text-sky-200">{new Date(endsAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} 자동 종료</span></p>;
}
