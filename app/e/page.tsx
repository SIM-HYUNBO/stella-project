"use client";

import { useEffect, useRef, useState } from "react";

/* ================= LED CSS (디자인 유지) ================= */
const ledCss = `
@keyframes led {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.led-bg {
  background: linear-gradient(270deg,#ff0080,#7928ca,#2afadf,#00ff88);
  background-size: 600% 600%;
  animation: led 6s ease infinite;
}
.led-border {
  border: 4px solid transparent;
  border-image: linear-gradient(270deg,#ff0080,#2afadf,#7928ca) 1;
}
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
.pulse { animation: pulse 1.2s infinite; }
`;

/* ================= 메인 ================= */
export default function KaraokeStage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [singing, setSinging] = useState(false);
  const [levels, setLevels] = useState<number[]>(Array(16).fill(10));
  const [chat, setChat] = useState<string[]>([
    "🔥 입장했습니다",
    "🎤 준비 완료",
  ]);

  /* ===== 카메라 + 마이크 실제 연결 ===== */
  useEffect(() => {
    let raf = 0;

    async function initMedia() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 마이크 파형 분석
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        analyser.getByteFrequencyData(dataArray);
        const bars = Array.from(dataArray)
          .slice(0, 16)
          .map((v) => v / 2);
        setLevels(bars);
        raf = requestAnimationFrame(loop);
      };
      loop();
    }

    initMedia();
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ===== 노래 시작 ===== */
  const toggleSing = async () => {
    if (!audioRef.current) return;

    if (singing) {
      audioRef.current.pause();
      setChat((c) => ["⏸ 노래 중지", ...c]);
    } else {
      try {
        await audioRef.current.play();
        setChat((c) => ["▶ 노래 시작!", ...c]);
      } catch {
        setChat((c) => ["⚠️ 오디오 재생 실패", ...c]);
      }
    }
    setSinging((s) => !s);
  };

  return (
    <>
      <style>{ledCss}</style>

      <div className="led-bg min-h-screen flex items-center justify-center p-6">
        <div className="bg-black/80 w-full max-w-4xl rounded-2xl p-6 space-y-6 text-white">
          {/* 🎤 START 버튼 */}
          <div className="flex justify-center">
            <button
              onClick={toggleSing}
              className="pulse px-10 py-4 text-xl font-bold rounded-full bg-pink-600 hover:bg-pink-500"
            >
              🎤 {singing ? "STOP SINGING" : "START SINGING"}
            </button>
          </div>

          {/* 🎥 얼굴 + 🎙 파형 */}
          <div className="led-border rounded-xl p-4 flex gap-4">
            {/* 얼굴 */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="flex-1 bg-black rounded-lg h-56 object-cover"
            />

            {/* 마이크 파형 */}
            <div className="w-48 bg-gray-900 rounded-lg h-56 flex items-end gap-1 p-2">
              {levels.map((h, i) => (
                <div
                  key={i}
                  className="bg-green-400 w-full rounded-sm transition-all"
                  style={{ height: `${h + 10}px` }}
                />
              ))}
            </div>
          </div>

          {/* 💬 채팅 */}
          <div className="led-border rounded-xl p-4 h-40 overflow-y-auto bg-black/60 space-y-1">
            {chat.map((msg, i) => (
              <p key={i} className="text-sm">
                💬 {msg}
              </p>
            ))}
          </div>

          {/* 🎵 노래 */}
          <audio ref={audioRef} src="/songs/sample.mp3" />
        </div>
      </div>
    </>
  );
}
