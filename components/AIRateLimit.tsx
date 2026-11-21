"use client";
import { useEffect, useState } from "react";
import { aiRetrySeconds } from "@/lib/ai-retry-delay";
import { aiRequestFailure } from "@/lib/ai-request-error";

export function useAIRateLimit() {
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const requestError = async (response: Response) => {
    const data = await response.json().catch(() => ({}));
    if (response.status === 429) {
      const seconds = typeof data.retryAfterSeconds === "number" && Number.isFinite(data.retryAfterSeconds) && data.retryAfterSeconds >= 0
        ? data.retryAfterSeconds : aiRetrySeconds(response.headers.get("retry-after"), data.error);
      setRetryAt(seconds === null ? null : Date.now() + seconds * 1000);
    }
    return new Error(aiRequestFailure(response.status, data));
  };
  return { retryAt, requestError, clearRateLimit: () => setRetryAt(null) };
}

export default function AIRateLimit({ retryAt }: { retryAt: number | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (retryAt === null) return;
    setNow(Date.now());
    const timer = window.setInterval(() => { const time = Date.now(); setNow(time); if (time >= retryAt) window.clearInterval(timer); }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);
  if (retryAt === null) return null;
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  return <p className="mx-4 mb-2 shrink-0 rounded-xl bg-amber-50 px-4 py-3 text-center text-xs text-amber-800">{seconds > 0 ? `이용 한도 대기시간 · ${Math.floor(seconds / 60)}분 ${String(seconds % 60).padStart(2, "0")}초 남았어` : "안내된 대기시간이 지났어. 다시 시도해 줘."}</p>;
}
