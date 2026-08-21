"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Params = {
  mouthOpen: number;
  smile: number;
  eyeOpenL: number;
  eyeOpenR: number;
  browRaiseL: number;
  browRaiseR: number;
  headTilt: number;
};

const SKIN_COLORS = ["#FFDBB4", "#F5CBA7", "#C68642", "#8D5524", "#FFB3BA", "#B5EAD7"];
const EYE_COLORS  = ["#4A90D9", "#43A047", "#8B5E3C", "#555", "#8E24AA"];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function drawAvatar(
  canvas: HTMLCanvasElement,
  p: Params,
  skinColor: string,
  eyeColor: string,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  const r = Math.min(W, H) * 0.38;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(p.headTilt * 0.25);

  // Shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = skinColor;
  ctx.fill();
  ctx.restore();

  // Face
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = skinColor;
  ctx.fill();

  // Shading overlay
  const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.25, 0, 0, 0, r);
  grad.addColorStop(0, "rgba(255,255,255,0.18)");
  grad.addColorStop(1, "rgba(0,0,0,0.10)");
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  const eyeY   = -r * 0.08;
  const eyeX   = r * 0.30;
  const eyeR   = r * 0.155;
  const browY  = eyeY - r * 0.22;

  // Blush (smiling)
  if (p.smile > 0.25) {
    const alpha = (p.smile - 0.25) * 0.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (const sx of [-eyeX, eyeX]) {
      ctx.beginPath();
      ctx.ellipse(sx, eyeY + r * 0.18, r * 0.17, r * 0.09, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#ff9999";
      ctx.fill();
    }
    ctx.restore();
  }

  // Eyes
  for (const [sx, openRatio] of [[-eyeX, p.eyeOpenL], [eyeX, p.eyeOpenR]] as [number, number][]) {
    ctx.save();
    ctx.translate(sx, eyeY);

    const oy = eyeR * Math.max(0.05, openRatio);

    // Clip to eye ellipse
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeR, oy, 0, 0, Math.PI * 2);
    ctx.clip();

    // White
    ctx.fillStyle = "white";
    ctx.fillRect(-eyeR, -oy, eyeR * 2, oy * 2);

    // Iris
    ctx.beginPath();
    ctx.arc(0, oy * 0.1, eyeR * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = eyeColor;
    ctx.fill();

    // Limbal ring
    ctx.beginPath();
    ctx.arc(0, oy * 0.1, eyeR * 0.62, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = eyeR * 0.12;
    ctx.stroke();

    // Pupil
    ctx.beginPath();
    ctx.arc(0, oy * 0.1, eyeR * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "#111";
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(-eyeR * 0.22, -oy * 0.3, eyeR * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fill();

    ctx.restore();

    // Outline
    ctx.save();
    ctx.translate(sx, eyeY);
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeR, oy, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // Eyebrows
  for (const [sx, raise, flip] of [[-eyeX, p.browRaiseL, -1], [eyeX, p.browRaiseR, 1]] as [number, number, number][]) {
    const by = browY - raise * r * 0.1;
    ctx.save();
    ctx.translate(sx, by);
    ctx.beginPath();
    ctx.moveTo(-eyeR * 0.8, raise * r * 0.04);
    ctx.quadraticCurveTo(0, -raise * r * 0.06 - r * 0.02, eyeR * 0.8, 0);
    ctx.strokeStyle = "rgba(80,50,20,0.75)";
    ctx.lineWidth = r * 0.055;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }

  // Nose
  ctx.save();
  ctx.translate(0, r * 0.12);
  ctx.beginPath();
  ctx.arc(-r * 0.08, 0, r * 0.035, 0, Math.PI * 2);
  ctx.arc(r * 0.08, 0, r * 0.035, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fill();
  ctx.restore();

  // Mouth
  const mouthY = r * 0.40;
  const mouthW = r * 0.42;
  const smileDip = p.smile * r * 0.22;
  const openH    = p.mouthOpen * r * 0.28;

  ctx.save();
  ctx.translate(0, mouthY);

  if (openH > r * 0.04) {
    // Open mouth cavity
    ctx.beginPath();
    ctx.ellipse(0, openH * 0.1, mouthW * 0.72, openH * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#5a1010";
    ctx.fill();
    // Teeth
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, openH * 0.1, mouthW * 0.72, openH * 0.8, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#f5f0e8";
    ctx.fillRect(-mouthW, -openH * 0.5, mouthW * 2, openH * 0.55);
    ctx.restore();
  }

  // Upper lip curve
  ctx.beginPath();
  ctx.moveTo(-mouthW, 0);
  ctx.bezierCurveTo(-mouthW * 0.5, -smileDip * 0.6, mouthW * 0.5, -smileDip * 0.6, mouthW, 0);
  // Lower lip
  ctx.bezierCurveTo(mouthW * 0.5, smileDip + openH, -mouthW * 0.5, smileDip + openH, -mouthW, 0);
  ctx.closePath();

  const lipColor = p.smile > 0.3 ? "#cc4444" : "#c07070";
  ctx.fillStyle = lipColor;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Mouth line
  ctx.beginPath();
  ctx.moveTo(-mouthW, 0);
  ctx.bezierCurveTo(-mouthW * 0.5, -smileDip * 0.6, mouthW * 0.5, -smileDip * 0.6, mouthW, 0);
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

export default function MemojiPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const paramsRef = useRef<Params>({
    mouthOpen: 0, smile: 0.3,
    eyeOpenL: 1, eyeOpenR: 1,
    browRaiseL: 0, browRaiseR: 0,
    headTilt: 0,
  });
  const skinRef = useRef("#FFDBB4");
  const eyeRef  = useRef("#4A90D9");

  const [status, setStatus]     = useState<"loading" | "ready" | "error">("loading");
  const [loadMsg, setLoadMsg]   = useState("AI 불러오는 중...");
  const [hasFace, setHasFace]   = useState(false);
  const [skinColor, setSkinColor] = useState("#FFDBB4");
  const [eyeColor, setEyeColor]   = useState("#4A90D9");

  // keep refs in sync for draw loop
  useEffect(() => { skinRef.current = skinColor; }, [skinColor]);
  useEffect(() => { eyeRef.current  = eyeColor;  }, [eyeColor]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        setLoadMsg("face-api 로딩 중...");
        const faceapi = await import("@vladmandic/face-api");

        setLoadMsg("AI 모델 다운로드 중... (처음엔 좀 걸려요)");
        const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);

        setLoadMsg("카메라 연결 중...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        streamRef.current = stream;
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus("ready");

        const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 });

        // — Detection loop (async, ~20fps) —
        const detect = async () => {
          while (!cancelled && videoRef.current) {
            try {
              const det = await faceapi
                .detectSingleFace(videoRef.current, opts)
                .withFaceLandmarks()
                .withFaceExpressions();

              if (det) {
                setHasFace(true);
                const pts = det.landmarks.positions;
                const faceSize = Math.sqrt(det.detection.box.width * det.detection.box.height);

                // Mouth open
                const mouthOpenRaw = Math.min(1, Math.max(0,
                  (pts[57].y - pts[51].y - faceSize * 0.02) / (faceSize * 0.18)));

                // Smile: corners up vs center
                const smileRaw = Math.min(1, Math.max(0,
                  ((pts[51].y + pts[57].y) / 2 - (pts[48].y + pts[54].y) / 2) / (faceSize * 0.06)));

                // Eye open ratio
                const eyeRatio = (top1: number, top2: number, bot1: number, bot2: number) =>
                  Math.min(1, Math.max(0,
                    ((pts[top1].y + pts[top2].y) / 2 - (pts[bot1].y + pts[bot2].y) / 2) / (faceSize * -0.07) + 0.55));
                const eyeOpenLRaw = eyeRatio(37, 38, 40, 41);
                const eyeOpenRRaw = eyeRatio(43, 44, 46, 47);

                // Brow raise
                const browRaise = (browPts: number[], eyePts: number[]) => {
                  const browY = browPts.reduce((s, i) => s + pts[i].y, 0) / browPts.length;
                  const eyeY  = eyePts.reduce((s, i) => s + pts[i].y, 0) / eyePts.length;
                  return Math.min(1, Math.max(0, (eyeY - browY) / (faceSize * 0.17) - 0.25));
                };
                const browRaiseLRaw = browRaise([17,18,19,20,21], [37,38,40,41]);
                const browRaiseRRaw = browRaise([22,23,24,25,26], [43,44,46,47]);

                // Head tilt
                const tilt = Math.atan2(pts[45].y - pts[36].y, pts[45].x - pts[36].x);

                const s = 0.3;
                const pr = paramsRef.current;
                pr.mouthOpen  = lerp(pr.mouthOpen,  mouthOpenRaw,  s);
                pr.smile      = lerp(pr.smile,      smileRaw,      s);
                pr.eyeOpenL   = lerp(pr.eyeOpenL,   eyeOpenLRaw,   s);
                pr.eyeOpenR   = lerp(pr.eyeOpenR,   eyeOpenRRaw,   s);
                pr.browRaiseL = lerp(pr.browRaiseL, browRaiseLRaw, s);
                pr.browRaiseR = lerp(pr.browRaiseR, browRaiseRRaw, s);
                pr.headTilt   = lerp(pr.headTilt,   tilt,          s * 0.5);
              } else {
                setHasFace(false);
              }
            } catch {}
            await new Promise(r => setTimeout(r, 50));
          }
        };

        // — Draw loop (60fps) —
        const draw = () => {
          if (cancelled || !canvasRef.current) return;
          drawAvatar(canvasRef.current, paramsRef.current, skinRef.current, eyeRef.current);
          rafRef.current = requestAnimationFrame(draw);
        };

        detect();
        draw();

      } catch (e) {
        if (!cancelled) { console.error(e); setStatus("error"); }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg,#1a0533,#0a1a3a)" }}>
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-xl font-bold active:scale-90 transition-transform">
          ‹
        </button>
        <div>
          <p className="text-white font-black text-base">미모지 ✨</p>
          <p className="text-white/40 text-xs">
            {status === "loading" ? loadMsg : hasFace ? "얼굴 인식 중" : "얼굴을 보여주세요"}
          </p>
        </div>
      </div>

      {/* 아바타 캔버스 */}
      <div className="flex-1 flex items-center justify-center px-6 py-4">
        <div className="relative">
          {/* 글로우 */}
          <div className="absolute inset-0 rounded-full blur-3xl opacity-30"
            style={{ background: skinColor, transform: "scale(0.85)" }} />

          <canvas
            ref={canvasRef}
            width={320}
            height={320}
            className="relative rounded-full"
            style={{
              background: "linear-gradient(135deg,#1e0a3c,#0d2150)",
              boxShadow: "0 0 60px rgba(168,85,247,0.25), 0 20px 60px rgba(0,0,0,0.5)",
            }}
          />

          {/* 로딩 오버레이 */}
          {status === "loading" && (
            <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center gap-3"
              style={{ background: "rgba(10,5,30,0.85)" }}>
              <div className="text-5xl" style={{ animation: "bounce 1s ease-in-out infinite" }}>🤖</div>
              <p className="text-white/70 text-xs font-bold text-center px-4">{loadMsg}</p>
            </div>
          )}

          {/* 에러 */}
          {status === "error" && (
            <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center gap-2"
              style={{ background: "rgba(10,5,30,0.9)" }}>
              <div className="text-4xl">⚠️</div>
              <p className="text-white/70 text-xs text-center px-4">로드 실패</p>
              <button onClick={() => window.location.reload()}
                className="mt-1 px-4 py-1.5 rounded-xl bg-white/15 text-white text-xs font-bold">
                재시도
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 숨겨진 비디오 */}
      <video ref={videoRef} className="hidden" playsInline muted />

      {/* 커스터마이즈 패널 */}
      {status === "ready" && (
        <div className="px-5 pb-12 space-y-5">
          {/* 피부색 */}
          <div>
            <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase mb-2">피부색</p>
            <div className="flex gap-3">
              {SKIN_COLORS.map(c => (
                <button key={c} onClick={() => setSkinColor(c)}
                  className="w-9 h-9 rounded-full transition-all active:scale-90"
                  style={{
                    background: c,
                    boxShadow: skinColor === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : "0 2px 6px rgba(0,0,0,0.4)",
                    transform: skinColor === c ? "scale(1.15)" : "scale(1)",
                  }} />
              ))}
            </div>
          </div>

          {/* 눈 색 */}
          <div>
            <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase mb-2">눈 색</p>
            <div className="flex gap-3">
              {EYE_COLORS.map(c => (
                <button key={c} onClick={() => setEyeColor(c)}
                  className="w-9 h-9 rounded-full transition-all active:scale-90"
                  style={{
                    background: c,
                    boxShadow: eyeColor === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : "0 2px 6px rgba(0,0,0,0.4)",
                    transform: eyeColor === c ? "scale(1.15)" : "scale(1)",
                  }} />
              ))}
            </div>
          </div>

          {/* 힌트 */}
          <div className="flex gap-4 flex-wrap">
            {[["😄","웃어봐"],["😮","입 벌려봐"],["😠","눈 찡그려봐"],["😱","눈썹 올려봐"]].map(([e,t]) => (
              <div key={t} className="flex items-center gap-1.5 bg-white/8 rounded-xl px-3 py-1.5">
                <span className="text-base">{e}</span>
                <span className="text-white/50 text-xs">{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)}
        }
      `}</style>
    </div>
  );
}
