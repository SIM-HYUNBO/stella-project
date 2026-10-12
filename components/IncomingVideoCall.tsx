"use client";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/app/firebase";
import { callRequest } from "@/lib/video-call-client";
import type { VideoCall } from "@/lib/video-call";
import { createPortal } from "react-dom";
import { VideoIcon } from "@/components/VideoCallButton";

export default function IncomingVideoCall() {
  const pathname = usePathname(), router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<VideoCall | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => onAuthStateChanged(auth, u => { setUid(u?.uid || null); setIncoming(null); }), []);
  useEffect(() => {
    if (!uid || pathname.startsWith("/video-call/")) { setIncoming(null); return; }
    let stopped = false, timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        if (document.visibilityState === "visible") {
          const { call } = await callRequest();
          if (!stopped) setIncoming(call?.status === "ringing" && call.toUid === uid ? call : null);
        }
      } catch { /* A missed poll retries; no repeated error banners across the app. */ }
      if (!stopped) timer = setTimeout(poll, 5000);
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [uid, pathname]);
  useEffect(() => { if (incoming) dialog.current?.showModal(); }, [incoming]);
  const decline = async () => {
    if (!incoming || busy) return;
    setBusy(true); setError("");
    try { await callRequest("", { action: "end", id: incoming.id }); setIncoming(null); }
    catch { setError("거절을 전달하지 못했어. 다시 눌러 줘."); }
    finally { setBusy(false); }
  };
  if (!incoming) return null;
  return createPortal(<dialog ref={dialog} aria-labelledby="incoming-video-title" onCancel={e => { e.preventDefault(); void decline(); }} className="m-auto w-80 max-w-[92vw] rounded-3xl p-6 bg-white text-center shadow-xl backdrop:bg-black/40">
    <div className="mx-auto mb-4 w-14 h-14 flex items-center justify-center rounded-full bg-sky-100 text-sky-500"><VideoIcon /></div>
    <h2 id="incoming-video-title" className="text-lg font-bold text-gray-800">{incoming.fromName}</h2>
    <p className="mt-2 mb-6 text-sm text-gray-500">영상통화가 왔어</p>
    {error && <p role="alert" className="mb-3 text-sm text-red-500">{error}</p>}
    <div className="flex gap-3"><button disabled={busy} onClick={decline} className="flex-1 rounded-xl bg-gray-100 py-3 text-gray-600">거절</button>
      <button disabled={busy} onClick={() => router.push(`/video-call/${incoming.id}`)} className="flex-1 rounded-xl bg-sky-500 py-3 font-bold text-white">받기</button></div>
    <p className="mt-3 text-xs text-gray-400">다음 화면에서 카메라를 켜고 수락해 줘.</p>
  </dialog>, document.body);
}
