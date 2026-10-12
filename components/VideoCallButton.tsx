"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { callRequest } from "@/lib/video-call-client";

export function VideoIcon() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="12" height="12" rx="3" /><path d="m15 10 6-4v12l-6-4" /></svg>;
}
export default function VideoCallButton({ userId, nickname, onStarted }: { userId: string; nickname: string; onStarted: () => void }) {
  const router = useRouter();
  const busyRef = useRef(false);
  const draft = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const start = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError("");
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error("영상통화를 지원하는 브라우저에서 HTTPS 주소로 열어 줘.");
      // Keep the id on retry: a lost response must not create a second call.
      draft.current ||= crypto.randomUUID();
      const result = await callRequest("", { action: "create", id: draft.current, toUid: userId });
      onStarted();
      router.push(`/video-call/${result.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "영상통화를 시작하지 못했어."); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <>
    <button type="button" title="영상통화" aria-label={`${nickname}에게 영상통화`} disabled={busy} onClick={start}
      className="w-full flex items-center gap-3 rounded-[14px] bg-sky-50 px-4 py-3 text-sky-700 active:scale-95 transition disabled:opacity-40"><VideoIcon /><span className="text-left"><span className="block font-bold text-sm">{busy ? "연결 준비 중…" : "영상통화"}</span><span className="block mt-1 text-xs">와기에서 얼굴 보며 대화하기</span></span></button>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </>;
}
