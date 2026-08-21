"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const EXPR_EMOJI: Record<string, { emoji: string; label: string }> = {
  happy:     { emoji: "😄", label: "행복" },
  sad:       { emoji: "😢", label: "슬픔" },
  angry:     { emoji: "😠", label: "화남" },
  surprised: { emoji: "😮", label: "놀람" },
  fearful:   { emoji: "😨", label: "두려움" },
  disgusted: { emoji: "🤢", label: "역겨움" },
  neutral:   { emoji: "😐", label: "무표정" },
};

type FaceState = {
  emoji: string;
  label: string;
  x: number;
  y: number;
  size: number;
};

export default function EmojiFacePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadMsg, setLoadMsg] = useState("AI 모델 불러오는 중...");
  const [face, setFace] = useState<FaceState | null>(null);
  const [hasFace, setHasFace] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        setLoadMsg("face-api 로딩 중...");
        const faceapi = await import("face-api.js");

        setLoadMsg("AI 모델 다운로드 중... (처음엔 좀 걸려요)");
        const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);

        setLoadMsg("카메라 권한 요청 중...");
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

        const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

        const loop = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const det = await faceapi
              .detectSingleFace(videoRef.current, opts)
              .withFaceExpressions();

            if (det) {
              setHasFace(true);
              const exps = det.expressions as unknown as Record<string, number>;
              const dominant = (Object.entries(exps) as [string, number][])
                .sort(([, a], [, b]) => b - a)[0][0];
              const info = EXPR_EMOJI[dominant] ?? EXPR_EMOJI.neutral;

              const vw = videoRef.current.videoWidth || 640;
              const vh = videoRef.current.videoHeight || 480;
              const box = det.detection.box;
              // mirror x because video is CSS-flipped
              const xPct = ((vw - box.x - box.width / 2) / vw) * 100;
              const yPct = (box.y / vh) * 100;
              const sizePct = (box.width / vw) * 100;

              setFace({ ...info, x: xPct, y: yPct, size: sizePct });
            } else {
              setHasFace(false);
              setFace(null);
            }
          } catch {}
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();

      } catch (e: any) {
        if (!cancelled) {
          console.error(e);
          setStatus("error");
        }
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
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 pt-10 pb-4"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)" }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white text-xl font-bold active:scale-90 transition-transform">
          ‹
        </button>
        <div>
          <p className="text-white font-black text-base">이모지 얼굴 인식 ✨</p>
          <p className="text-white/50 text-xs">
            {status === "ready" ? (hasFace && face ? `${face.label} 감지됨` : "얼굴을 보여주세요") : "로딩 중..."}
          </p>
        </div>
      </div>

      {/* 카메라 피드 */}
      <div className="relative flex-1">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
          playsInline
          muted
        />

        {/* 이모지 오버레이 - 얼굴 위에 따라다님 */}
        {status === "ready" && face && (
          <div
            className="absolute pointer-events-none z-10 transition-all duration-75"
            style={{
              left: `${face.x}%`,
              top: `${face.y}%`,
              fontSize: `${Math.min(120, Math.max(48, face.size * 3.2))}px`,
              transform: "translate(-50%, -110%)",
              filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.6))",
              lineHeight: 1,
            }}
          >
            {face.emoji}
          </div>
        )}

        {/* 로딩 */}
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-10">
            <div className="text-7xl" style={{ animation: "bounce 1s infinite" }}>🤖</div>
            <div className="bg-black/60 backdrop-blur-sm rounded-3xl px-7 py-5 text-center">
              <p className="text-white font-black text-sm mb-1">{loadMsg}</p>
              <p className="text-white/40 text-xs">인터넷 연결이 필요해요</p>
            </div>
          </div>
        )}

        {/* 에러 */}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-black/70 backdrop-blur-sm rounded-3xl px-8 py-7 text-center mx-6">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-white font-black text-base mb-1">로드 실패</p>
              <p className="text-white/50 text-xs">카메라 권한이나 인터넷 연결을 확인해주세요</p>
              <button onClick={() => window.location.reload()}
                className="mt-4 px-5 py-2.5 rounded-2xl bg-white/15 text-white text-sm font-bold active:scale-95 transition-transform">
                다시 시도
              </button>
            </div>
          </div>
        )}

        {/* 얼굴 없을 때 안내 */}
        {status === "ready" && !hasFace && (
          <div className="absolute bottom-44 left-0 right-0 flex justify-center z-10">
            <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-6 py-3 flex items-center gap-2">
              <span className="text-2xl">👀</span>
              <p className="text-white text-sm font-bold">카메라를 바라봐 주세요</p>
            </div>
          </div>
        )}
      </div>

      {/* 표정 팔레트 바 */}
      {status === "ready" && (
        <div className="z-10 shrink-0 pb-8 pt-4 px-5"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.5))" }}>
          <p className="text-white/30 text-[10px] text-center mb-3 tracking-widest uppercase">감지 표정</p>
          <div className="flex justify-around items-center">
            {Object.entries(EXPR_EMOJI).map(([, { emoji, label }]) => {
              const active = face?.label === label;
              return (
                <div key={label} className="flex flex-col items-center gap-1 transition-all duration-200"
                  style={{ transform: active ? "scale(1.35)" : "scale(1)", opacity: active ? 1 : 0.35 }}>
                  <span style={{ fontSize: 24 }}>{emoji}</span>
                  <span className="text-white/60 text-[9px]">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
      `}</style>
    </div>
  );
}
