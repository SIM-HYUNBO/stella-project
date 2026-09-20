"use client";

import { useEffect, useRef, useState } from "react";

const CHANNELS = [
  { id: "rUxyKA_-grg", name: "로파이", emoji: "🎵", bg: "#b97981" }, // Chillhop 컴필레이션
  { id: "Dx5qFachd3A", name: "재즈",   emoji: "🎷", bg: "#7981b9" },
  { id: "q76bMs-NwRk", name: "자연",   emoji: "🌿", bg: "#5a9e6f" },
  { id: "lTRiuFIWV54", name: "공부",   emoji: "📚", bg: "#b9a179" }, // 집중 음악 컴필레이션
];

export default function MusicPlayer() {
  const [open, setOpen]       = useState(false);
  const [chIdx, setChIdx]     = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady]     = useState(false);
  const playerRef = useRef<any>(null);
  const elRef     = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // React 트리 밖에 숨겨진 div 생성 (YT가 이걸 iframe으로 교체)
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;bottom:0;right:0;";
    document.body.appendChild(el);
    elRef.current = el;

    function createPlayer() {
      playerRef.current = new (window as any).YT.Player(el, {
        videoId: CHANNELS[0].id,
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0 },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e: any) => setPlaying(e.data === 1),
        },
      });
    }

    if ((window as any).YT?.Player) {
      createPlayer();
    } else {
      // 스크립트가 없으면 삽입
      if (!document.getElementById("yt-api-script")) {
        const s = document.createElement("script");
        s.id = "yt-api-script";
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      }
      const prev = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        createPlayer();
        prev?.();
      };
    }

    return () => {
      try { playerRef.current?.destroy(); } catch {}
      el.remove();
    };
  }, []);

  const switchChannel = (idx: number) => {
    if (!ready || !playerRef.current) return;
    setChIdx(idx);
    playerRef.current.loadVideoById(CHANNELS[idx].id);
    setPlaying(true);
  };

  const togglePlay = () => {
    if (!ready || !playerRef.current) return;
    playing ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
  };

  const ch = CHANNELS[chIdx];

  return (
    <div className="mt-4">
      {/* 토글 버튼 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full rounded-2xl py-3 text-sm font-bold transition-colors"
        style={{ background: open ? ch.bg : "#f4e9e0", color: open ? "#fff" : "#66544e" }}
      >
        {playing ? "♫ " : "♩ "}
        {open ? `${ch.emoji} ${ch.name} 듣는 중` : "🎶 방 음악 틀기"}
      </button>

      {/* 플레이어 패널 */}
      {open && (
        <div className="mt-2 rounded-2xl bg-white/90 p-4 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            {/* 회전 레코드 */}
            <div
              className="relative shrink-0 w-14 h-14 rounded-full flex items-center justify-center shadow-md"
              style={{
                background: `radial-gradient(circle at 50%, ${ch.bg}55 30%, ${ch.bg} 100%)`,
                animation: playing ? "mp-spin 4s linear infinite" : "none",
              }}
            >
              <div className="absolute w-4 h-4 rounded-full bg-white/80" />
              <span className="relative z-10 text-sm">{ch.emoji}</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#66544e] text-sm truncate">{ch.name} 채널</p>
              <p className="text-xs text-[#a58d81] mt-0.5">
                {!ready ? "로딩 중…" : playing ? "재생 중 ✦" : "일시정지"}
              </p>
            </div>

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
                className="flex-1 rounded-xl py-2 text-xs font-bold transition-colors"
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
            유튜브 스트림 · 볼륨은 기기 버튼으로 조절해
          </p>
        </div>
      )}
    </div>
  );
}
