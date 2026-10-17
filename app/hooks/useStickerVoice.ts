"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isStickerVoice, MAX_STICKER_VOICE_DATA, MAX_STICKER_VOICE_SECONDS, STICKER_VOICE_EVENT, StickerVoice } from "@/lib/custom-stickers";

type Phase = "idle" | "permission" | "recording" | "processing";

export default function useStickerVoice(onChange: (voice: StickerVoice | undefined) => void) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timers = useRef<{ stop?: ReturnType<typeof setTimeout>; tick?: ReturnType<typeof setInterval> }>({});
  const mounted = useRef(false);
  const active = useRef(false);
  const reader = useRef<FileReader | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const release = useCallback(() => {
    clearTimeout(timers.current.stop); clearInterval(timers.current.tick); timers.current = {};
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
  }, []);

  const stop = useCallback(() => {
    clearTimeout(timers.current.stop); clearInterval(timers.current.tick);
    if (recorder.current?.state === "recording") {
      if (mounted.current) setPhase("processing");
      recorder.current.stop();
    }
    // Release the microphone immediately, including when this UI is closed.
    release();
  }, [release]);

  useEffect(() => {
    mounted.current = true;
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      mounted.current = false; active.current = false;
      document.removeEventListener("visibilitychange", hidden);
      const current = recorder.current;
      if (current) { current.ondataavailable = null; current.onstop = null; current.onerror = null; if (current.state === "recording") current.stop(); }
      recorder.current = null; reader.current?.abort(); reader.current = null; release();
    };
  }, [release, stop]);

  const start = async () => {
    if (active.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("이 브라우저는 녹음을 지원하지 않아. 다른 브라우저에서 시도해 줘."); return;
    }
    active.current = true; setPhase("permission"); setError(""); setSeconds(0);
    window.dispatchEvent(new CustomEvent(STICKER_VOICE_EVENT));
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { mic.getTracks().forEach(track => track.stop()); return; }
      stream.current = mic;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"].find(type => MediaRecorder.isTypeSupported(type));
      const recording = new MediaRecorder(mic, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 24000 });
      recorder.current = recording;
      const chunks: Blob[] = [];
      let bytes = 0;
      let tooLarge = false;
      let failed = false;
      const started = performance.now();
      recording.ondataavailable = event => {
        if (!event.data.size) return;
        bytes += event.data.size;
        if (bytes > MAX_STICKER_VOICE_DATA * 0.74) { tooLarge = true; stop(); return; }
        chunks.push(event.data);
      };
      recording.onerror = () => { failed = true; stop(); active.current = false; if (mounted.current) { setError("녹음을 마치지 못했어. 다시 녹음해 줘."); setPhase("idle"); } };
      recording.onstop = () => {
        release(); recorder.current = null;
        if (!mounted.current) return;
        const duration = (performance.now() - started) / 1000;
        if (failed || tooLarge || !bytes || duration > MAX_STICKER_VOICE_SECONDS + 0.5) {
          active.current = false; setPhase("idle"); setError(tooLarge ? "녹음 용량이 커. 조금 더 짧게 녹음해 줘." : "녹음을 저장하지 못했어. 다시 녹음해 줘."); return;
        }
        const fileReader = new FileReader(); reader.current = fileReader;
        fileReader.onload = () => {
          if (!mounted.current) return;
          const voice = { data: String(fileReader.result), duration: Math.max(0.01, duration) };
          if (isStickerVoice(voice)) onChangeRef.current(voice);
          else setError("녹음 형식을 저장하지 못했어. 다른 브라우저에서 다시 녹음해 줘.");
          reader.current = null; active.current = false; setPhase("idle");
        };
        fileReader.onerror = () => { if (mounted.current) { setError("목소리를 저장하지 못했어. 다시 녹음해 줘."); active.current = false; setPhase("idle"); } reader.current = null; };
        try { fileReader.readAsDataURL(new Blob(chunks, { type: recording.mimeType || mimeType || chunks[0]?.type || "audio/webm" })); }
        catch { reader.current = null; active.current = false; setPhase("idle"); setError("목소리를 저장하지 못했어. 다시 녹음해 줘."); }
      };
      recording.start(250); setPhase("recording");
      timers.current.stop = setTimeout(stop, MAX_STICKER_VOICE_SECONDS * 1000);
      timers.current.tick = setInterval(() => { if (mounted.current) setSeconds(Math.min(MAX_STICKER_VOICE_SECONDS, Math.floor((performance.now() - started) / 1000))); }, 200);
    } catch (e) {
      recorder.current = null; release(); active.current = false;
      if (!mounted.current) return;
      const denied = e instanceof DOMException && ["NotAllowedError", "SecurityError"].includes(e.name);
      setError(denied ? "마이크 권한을 허용해 줘. 브라우저 주소 옆 권한 설정에서 바꿀 수 있어." : "마이크를 켜지 못했어. 연결 상태를 확인하고 다시 눌러 줘."); setPhase("idle");
    }
  };
  return { phase, seconds, error, start, stop, busy: phase !== "idle" };
}
