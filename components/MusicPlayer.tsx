"use client";

import { useEffect, useRef, useState } from "react";

const CHANNELS = [
  { id: "jfKfPfyJRdk", name: "로파이", emoji: "🎵", bg: "#b97981" },
  { id: "Dx5qFachd3A", name: "재즈", emoji: "🎷", bg: "#7981b9" },
  { id: "q76bMs-NwRk", name: "자연", emoji: "🌿", bg: "#5a9e6f" },
  { id: "5qap5aO4i9A", name: "공부", emoji: "📚", bg: "#b9a179" },
];

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function MusicPlayer() {
  const [open, setOpen] = useState(false);
  const [chIdx, setChIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // YouTube IFrame API 로드
  useEffect(() => {
    if (window.YT?.Player) { initPlayer(); return; }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = initPlayer;
    return () => { window.onYouTubeIframeAPIReady = () => {}; };
  }, []);

  function initPlayer() {
    if (!containerRef.current) return;
    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId: CHANNELS[0].id,
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0 },
      events: {
        onReady: () => setReady(true),
        onStateChange: (e: any) => {
          // 1 = playing, 2 = paused, 0 = ended
          if (e.data === 0) { setPlaying(false); }
          else { setPlaying(e.data === 1); }
        },
      },
    });
  }

  const switchChannel = (idx: number) => {
    if (!ready || !playerRef.current) return;
    setChIdx(idx);
    playerRef.current.loadVideoById(CHANNELS[idx].id);
    setPlaying(true);
  };

  const togglePlay = () => {
    if (!ready || !playerRef.current) return;
    if (playing) { playerRef.current.pauseVideo(); }
    else { playerRef.current.playVideo(); }
  };

  const ch = CHANNELS[chIdx];

  return (
    <div className="mt-4">
      {/* 토글 버튼 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full rounded-2xl py-3 text-sm font-bold transition-all"
        style={{ background: open ? ch.bg : "#f4e9e0", color: open ? "#fff" : "#66544e" }}
      >
        {playing ? "♫ " : "♩ "}{open ? `${ch.emoji} ${ch.name} 듣는 중` : "🎶 방 음악 틀기"}
      </button>

      {/* 플레이어 패널 */}
      {open && (
        <div className="mt-2 rounded-2xl bg-white/90 p-4 shadow-sm">
          {/* 레코드 + 컨트롤 */}
          <div className="flex items-center gap-4 mb-4">
            {/* 레코드 */}
            <div
              className="relative shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md"
              style={{
                background: `radial-gradient(circle at 50%, ${ch.bg}55 30%, ${ch.bg} 100%)`,
                animation: playing ? "spin 4s linear infinite" : "none",
              }}
            >
              <div className="absolute w-4 h-4 rounded-full bg-white/80 shadow-inner" />
              <span className="relative z-10" style={{ fontSize: 14 }}>{ch.emoji}</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#66544e] text-sm truncate">{ch.name} 채널</p>
              <p className="text-xs text-[#a58d81] mt-0.5">{playing ? "재생 중 ✦" : ready ? "일시정지" : "로딩 중…"}</p>
            </div>

            {/* 재생/정지 */}
            <button
              onClick={togglePlay}
              disabled={!ready}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg disabled:opacity-40 shrink-0"
              style={{ background: ch.bg }}
            >
              {playing ? "⏸" : "▶"}
            </button>
          </div>

          {/* 채널 선택 */}
          <div className="flex gap-2">
            {CHANNELS.map((c, i) => (
              <button
                key={c.id}
                onClick={() => switchChannel(i)}
                className="flex-1 rounded-xl py-2 text-xs font-bold transition-all"
                style={{
                  background: chIdx === i ? c.bg : "#f4e9e0",
                  color: chIdx === i ? "#fff" : "#66544e",
                }}
              >
                {c.emoji}<br />{c.name}
              </button>
            ))}
          </div>

          <p className="mt-3 text-[10px] text-[#c0a898] text-center">
            유튜브 뮤직 스트림 · 볼륨은 기기 버튼으로 조절해
          </p>
        </div>
      )}

      {/* 숨겨진 YouTube 플레이어 마운트 포인트 */}
      <div ref={containerRef} className="hidden" />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
