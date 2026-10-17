"use client";

import { useEffect, useRef, useState } from "react";
import { EyePoint, FacePose, StickerFace } from "@/lib/custom-stickers";
import { landmarkPose } from "@/lib/sticker-face";
import StickerFaceImage from "./StickerFaceImage";

const DEFAULT_EYES: [EyePoint, EyePoint] = [{ x: 0.35, y: 0.4 }, { x: 0.65, y: 0.4 }];

export default function StickerFaceCapture({ image, value, onChange, disabled, onBusy }: { image: string; value?: StickerFace; onChange: (v: StickerFace | undefined) => void; disabled: boolean; onBusy: (busy: boolean) => void }) {
  const [phase, setPhase] = useState<"idle" | "loading" | "live" | "recording">("idle");
  const [error, setError] = useState(""), [found, setFound] = useState(false), [seconds, setSeconds] = useState(0);
  const [pose, setPose] = useState<FacePose>();
  const [eyes, setEyes] = useState<[EyePoint, EyePoint]>(value?.eyes || DEFAULT_EYES);
  const [eyeStep, setEyeStep] = useState<number | null>(null);
  const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null);
  const generation = useRef(0), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recording = useRef<{ started: number; frames: FacePose[] } | null>(null);
  const busy = useRef(false), eyesRef = useRef(eyes); eyesRef.current = eyes;
  const change = useRef(onChange); change.current = onChange;
  const busyCallback = useRef(onBusy); busyCallback.current = onBusy;
  const close = () => {
    generation.current++; if (timer.current) clearTimeout(timer.current); timer.current = null;
    if (deadline.current) clearTimeout(deadline.current); deadline.current = null;
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
    if (video.current) video.current.srcObject = null;
    recording.current = null; busy.current = false; busyCallback.current(false);
  };
  useEffect(() => {
    const hide = () => { if (document.hidden) { close(); setPhase("idle"); setPose(undefined); } };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide); close(); };
  }, []);
  const start = async () => {
    if (busy.current || !image || disabled) return;
    busy.current = true; onBusy(true); setPhase("loading"); setError(""); setFound(false);
    const token = ++generation.current;
    deadline.current = setTimeout(() => {
      if (token !== generation.current) return;
      close(); setPhase("idle"); setError("카메라 준비가 오래 걸려. 연결을 확인하고 다시 켜 줘.");
    }, 25000);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Error("이 브라우저는 카메라를 지원하지 않아.");
      // Request from the explicit camera button only. No video leaves this device.
      const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } }, audio: false });
      if (token !== generation.current) { camera.getTracks().forEach(t => t.stop()); return; }
      stream.current = camera;
      if (!video.current) throw Error("카메라를 열지 못했어.");
      video.current.srcObject = camera; await video.current.play();
      const faceapi = await import("@vladmandic/face-api");
      if (token !== generation.current) return;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.isLoaded ? undefined : faceapi.nets.tinyFaceDetector.loadFromUri("/sticker-face-models"),
        faceapi.nets.faceLandmark68TinyNet.isLoaded ? undefined : faceapi.nets.faceLandmark68TinyNet.loadFromUri("/sticker-face-models"),
      ]);
      if (token !== generation.current) return;
      if (deadline.current) clearTimeout(deadline.current); deadline.current = null;
      setPhase("live");
      const loop = async () => {
        if (token !== generation.current || !video.current) return;
        try {
          const result = await faceapi.detectSingleFace(video.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.45 })).withFaceLandmarks(true);
          if (token !== generation.current) return;
          setFound(!!result);
          if (result) {
            const active = recording.current;
            const t = active ? Math.min(4, (performance.now() - active.started) / 1000) : 0;
            const next = landmarkPose(result.landmarks.getLeftEye(), result.landmarks.getRightEye(), result.landmarks.getNose()[3], t);
            if (next) {
              setPose(next);
              if (active && active.frames.length < 80 && (!active.frames.length || t > active.frames[active.frames.length - 1].t)) active.frames.push(next);
            }
          }
          const active = recording.current;
          if (active) setSeconds(Math.min(4, Math.floor((performance.now() - active.started) / 1000)));
          timer.current = setTimeout(loop, 90);
        } catch { if (token === generation.current) { close(); setPhase("idle"); setPose(undefined); setError("얼굴 움직임을 읽지 못했어. 카메라를 다시 켜 줘."); } }
      };
      void loop();
    } catch (e) {
      if (token !== generation.current) return;
      close(); setPhase("idle");
      setError(e instanceof DOMException && e.name === "NotAllowedError" ? "카메라 권한을 허용해 줘. 주소 옆 권한 설정에서 바꿀 수 있어." : "카메라나 얼굴 인식 모델을 열지 못했어. 연결을 확인하고 다시 눌러 줘.");
    }
  };
  return <div className="mt-4 rounded-2xl bg-violet-50/70 p-3">
    <p className="text-xs font-bold text-violet-700">나 따라 하기</p>
    <p className="mt-1 text-xs leading-relaxed text-slate-500">눈 위치를 짚고 카메라를 켜 봐. 고개와 눈 깜빡임을 4초 동안 담아 보내!</p>
    <p className="mt-1 text-[10px] text-slate-400">얼굴 영상은 저장·전송하지 않고, 그림의 움직임만 저장해.</p>
    {image && <>
      <button type="button" disabled={disabled || phase !== "idle"} onClick={() => setEyeStep(0)} className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-violet-600">그림의 눈 위치 지정</button>
      {eyeStep !== null && <div className="mt-2"><p className="text-xs text-violet-600">{eyeStep === 0 ? "그림 왼쪽 눈" : "그림 오른쪽 눈"}의 가운데를 눌러 줘</p>
        <button type="button" aria-label="그림의 눈 위치 선택" className="relative mt-2 block aspect-square w-full max-w-[220px] rounded-xl bg-white" onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect(); const point = { x: Math.max(0.08, Math.min(0.92, (e.clientX - rect.left) / rect.width)), y: Math.max(0.08, Math.min(0.92, (e.clientY - rect.top) / rect.height)) };
          if (eyeStep === 1 && Math.hypot(point.x - eyes[0].x, point.y - eyes[0].y) < 0.14) { setError("두 눈의 위치를 조금 떨어뜨려 찍어 줘."); return; }
          setError("");
          const next: [EyePoint, EyePoint] = [...eyes]; next[eyeStep] = point; setEyes(next); if (value) onChange({ ...value, eyes: next }); setEyeStep(eyeStep === 0 ? 1 : null);
        }}><img src={image} alt="눈 위치를 지정할 내 그림" className="h-full w-full object-contain" />{eyes.map((p, i) => <span key={i} className="pointer-events-none absolute h-3 w-3 rounded-full border-2 border-violet-500 bg-white/70" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, transform: "translate(-50%,-50%)" }} />)}</button>
      </div>}
    </>}
    <video ref={video} muted playsInline className={phase === "idle" ? "hidden" : "mt-3 aspect-video w-full rounded-xl bg-slate-900 object-cover"} style={{ transform: "scaleX(-1)" }} />
    {pose && phase !== "idle" && <div className="flex justify-center"><StickerFaceImage src={image} pose={pose} eyes={eyes} name="얼굴 움직임 미리보기" /></div>}
    {phase === "idle" ? <div className="mt-2 flex gap-2"><button disabled={disabled || !image || eyeStep !== null} onClick={start} className="rounded-xl bg-violet-100 px-3 py-2 text-xs font-semibold text-violet-700 disabled:opacity-40">카메라 켜기</button>
      {value && <button disabled={disabled} onClick={() => onChange(undefined)} className="px-2 text-xs text-slate-500">움직임 지우기</button>}</div> : <div className="mt-2 flex items-center gap-2">
      {phase === "live" && <button disabled={!found} onClick={() => {
        recording.current = { started: performance.now(), frames: [] }; setSeconds(0); setPhase("recording");
        deadline.current = setTimeout(() => {
          const frames = recording.current?.frames || [];
          close(); setPhase("idle"); setPose(undefined);
          if (frames.length >= 5) change.current({ duration: 4, frames, eyes: eyesRef.current });
          else setError("얼굴이 잘 보이지 않았어. 밝은 곳에서 다시 담아 줘.");
        }, 4000);
      }} className="rounded-xl bg-violet-500 px-3 py-2 text-xs text-white disabled:opacity-40">4초 움직임 담기</button>}
      <button onClick={() => { close(); setPhase("idle"); setPose(undefined); }} className="rounded-xl bg-white px-3 py-2 text-xs">카메라 끄기</button>
      <span role="status" className="text-xs text-violet-600">{phase === "loading" ? "얼굴 인식 준비 중…" : phase === "recording" ? `${seconds}/4초` : found ? "이제 고개를 움직여 봐!" : "카메라에 얼굴을 보여 줘"}</span>
    </div>}
    {value && phase === "idle" && <p className="mt-2 text-xs text-violet-600">움직임을 담았어! 위 미리보기에서 확인해 봐.</p>}
    {error && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
  </div>;
}
