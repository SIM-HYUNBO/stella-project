"use client";

import { useEffect, useRef, useState } from "react";

export default function ForestBackgroundWithMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = 0.4;
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-sky-100">
      {/* 🎵 배경 음악 */}
      <audio ref={audioRef} loop>
  <source src="/forest.mp3" type="audio/mpeg" />
</audio>


      {/* 🌫 안개 */}
      <div className="absolute inset-0 bg-white/5 blur-3xl animate-pulse" />

      {/* 🌤 빛 */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-300/10 rounded-full blur-3xl animate-[float_12s_ease-in-out_infinite]" />
      <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-green-200/10 rounded-full blur-2xl animate-[float_15s_ease-in-out_infinite]" />

      {/* 🌲 숲 */}
      <div className="absolute bottom-0 left-0 w-full h-[60%] flex justify-around items-end opacity-90">
        <Tree size="text-8xl" />
        <Tree size="text-9xl" />
        <Tree size="text-7xl" />
        <Tree size="text-[10rem]" />
        <Tree size="text-8xl" />
      </div>

      {/* 🌿 풀 */}
      <div className="absolute bottom-0 left-0 w-full h-[30%] flex justify-evenly items-end opacity-80">
        <Grass />
        <Grass />
        <Grass />
        <Grass />
      </div>

      {/* ✨ 중앙 텍스트 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center">
        <h1 className="text-5xl md:text-7xl font-bold drop-shadow-lg">
          Quiet Forest
        </h1>
        <p className="mt-4 text-lg opacity-70">
          공부하다 지치면, 그냥 즐기는 숲
        </p>
      </div>

      {/* 🎧 음악 버튼 */}
      <button
        onClick={toggleMusic}
        className="absolute bottom-6 right-6 px-5 py-3 rounded-full bg-black/40 backdrop-blur text-white hover:bg-black/60 transition"
      >
        {playing ? "🎵 소리 끄기" : "🎶 소리 켜기"}
      </button>

      {/* ✨ 별 */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            className="absolute text-white/40 animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              fontSize: `${Math.random() * 6 + 2}px`,
            }}
          >
            ✦
          </span>
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function Tree({ size }: { size: string }) {
  return (
    <div
      className={`${size} text-green-700/80 drop-animate-[float_10s_ease-in-out_infinite]`}
    >
      🌲
    </div>
  );
}

function Grass() {
  return (
    <div className="text-6xl text-green-600/70 animate-[float_6s_ease-in-out_infinite]">
      🌿
    </div>
  );
}
