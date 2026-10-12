"use client";
import { useEffect, useRef, useState } from "react";
import CallActionButton from "@/components/CallActionButton";

/** A stable video element: changing its size must not restart tracks or duplicate audio. */
export default function CallVideoTile({ stream, name, local, cameraOff, large, smallIndex, onSelect }: {
  stream: MediaStream | null; name: string; local: boolean; cameraOff: boolean;
  large: boolean; smallIndex: number; onSelect: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let cancelled = false;
    element.srcObject = stream;
    setBlocked(false);
    if (stream) void element.play().catch(() => { if (!cancelled && !local) setBlocked(true); });
    return () => { cancelled = true; element.srcObject = null; };
  }, [stream, local]);
  return <div
    className={`absolute overflow-hidden bg-slate-800 ${large ? "inset-0" : "z-10 rounded-2xl border border-white/30 shadow-lg"}`}
    style={large ? undefined : { right: 12, top: `${4 + smallIndex * 29}%`, width: "28%", maxWidth: 160, height: "24%" }}>
    <video ref={video} autoPlay muted={local} playsInline aria-label={local ? "내 영상" : `${name} 영상`}
      className={`h-full w-full ${large ? "object-contain" : "object-cover"} ${local ? "-scale-x-100" : ""} ${cameraOff ? "invisible" : ""}`} />
    {(!stream || cameraOff) && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-xs text-slate-300 p-3">{cameraOff ? "카메라 꺼짐" : "연결 중…"}</div>}
    {!large && <button type="button" aria-label={`${local ? "내" : name} 화면 크게 보기`} title={`${local ? "내" : name} 화면 크게 보기`} onClick={onSelect} className="absolute inset-0 focus-visible:outline focus-visible:outline-sky-300 focus-visible:-outline-offset-4" />}
    <span className="pointer-events-none absolute left-2 bottom-2 rounded-full bg-black/45 px-2 py-1 text-xs text-white">{local ? "나" : name}</span>
    {blocked && <CallActionButton action="sound" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" onClick={() => { void video.current?.play().then(() => setBlocked(false)).catch(() => {}); }} />}
  </div>;
}
