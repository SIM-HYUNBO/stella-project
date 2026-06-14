"use client";
import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

type SoundParams = {
  clickFreq: number; clickQ: number; clickVol: number;
  thumpStart: number; thumpEnd: number; thumpDecay: number; thumpVol: number;
};

function playClick(ctx: AudioContext, s: SoundParams, mult = 1.0) {
  const now = ctx.currentTime;
  const dur = 0.004;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.4));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bpf = ctx.createBiquadFilter(); bpf.type = "bandpass";
  bpf.frequency.value = s.clickFreq * mult; bpf.Q.value = s.clickQ;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(s.clickVol, now);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(bpf); bpf.connect(ng); ng.connect(ctx.destination); src.start(now);

  const osc = ctx.createOscillator(); osc.type = "sine";
  osc.frequency.setValueAtTime(s.thumpStart * mult, now);
  osc.frequency.exponentialRampToValueAtTime(s.thumpEnd * mult, now + s.thumpDecay);
  const og = ctx.createGain();
  og.gain.setValueAtTime(s.thumpVol, now);
  og.gain.exponentialRampToValueAtTime(0.0001, now + s.thumpDecay + 0.01);
  osc.connect(og); og.connect(ctx.destination); osc.start(now); osc.stop(now + s.thumpDecay + 0.02);
}

type ThemeDef = {
  id: string; name: string; dot: string;
  pageBg: string;
  keyBg: string; keyDownBg: string;
  keyShadow: string; keyDownShadow: string;
  keyText: string; border: string; topBorder: string;
  sound: SoundParams;
};

const THEMES: ThemeDef[] = [
  {
    id: "dark", name: "다크", dot: "#555",
    pageBg: "radial-gradient(ellipse at center,#1e1e2e 0%,#0d0d0d 100%)",
    keyBg: "linear-gradient(180deg,#525252 0%,#424242 100%)",
    keyDownBg: "linear-gradient(180deg,#363636 0%,#2e2e2e 100%)",
    keyShadow: "0 8px 0 #0a0a0a,inset 0 1px 0 rgba(255,255,255,0.1)",
    keyDownShadow: "0 2px 0 #080808,inset 0 2px 6px rgba(0,0,0,0.7)",
    keyText: "rgba(255,255,255,0.15)", border: "rgba(255,255,255,0.06)", topBorder: "rgba(255,255,255,0.1)",
    sound: { clickFreq: 3500, clickQ: 1.0, clickVol: 0.28, thumpStart: 240, thumpEnd: 65, thumpDecay: 0.055, thumpVol: 0.20 },
  },
  {
    id: "light", name: "라이트", dot: "#d4d0c8",
    pageBg: "linear-gradient(135deg,#f0ede8 0%,#ddd8d0 100%)",
    keyBg: "linear-gradient(180deg,#faf8f5 0%,#eae7e2 100%)",
    keyDownBg: "linear-gradient(180deg,#e0ddd8 0%,#d0cdc8 100%)",
    keyShadow: "0 8px 0 #999,inset 0 1px 0 rgba(255,255,255,0.8)",
    keyDownShadow: "0 2px 0 #aaa,inset 0 2px 6px rgba(0,0,0,0.2)",
    keyText: "rgba(0,0,0,0.1)", border: "rgba(0,0,0,0.08)", topBorder: "rgba(255,255,255,0.7)",
    sound: { clickFreq: 2200, clickQ: 0.6, clickVol: 0.16, thumpStart: 160, thumpEnd: 50, thumpDecay: 0.07, thumpVol: 0.13 },
  },
  {
    id: "ocean", name: "오션", dot: "#0ea5e9",
    pageBg: "radial-gradient(ellipse at center,#0c1a2e 0%,#060e1a 100%)",
    keyBg: "linear-gradient(180deg,#163552 0%,#0e2540 100%)",
    keyDownBg: "linear-gradient(180deg,#0c2038 0%,#091828 100%)",
    keyShadow: "0 8px 0 #041020,inset 0 1px 0 rgba(14,165,233,0.2)",
    keyDownShadow: "0 2px 0 #030c18,inset 0 2px 6px rgba(0,0,0,0.8)",
    keyText: "rgba(125,211,252,0.15)", border: "rgba(14,165,233,0.12)", topBorder: "rgba(14,165,233,0.15)",
    sound: { clickFreq: 1800, clickQ: 0.5, clickVol: 0.12, thumpStart: 130, thumpEnd: 40, thumpDecay: 0.09, thumpVol: 0.10 },
  },
  {
    id: "retro", name: "레트로", dot: "#d4a853",
    pageBg: "linear-gradient(135deg,#2a1a08 0%,#1a1008 100%)",
    keyBg: "linear-gradient(180deg,#c8a870 0%,#b89060 100%)",
    keyDownBg: "linear-gradient(180deg,#a08050 0%,#907040 100%)",
    keyShadow: "0 8px 0 #3a2810,inset 0 1px 0 rgba(255,220,150,0.3)",
    keyDownShadow: "0 2px 0 #2a1808,inset 0 2px 6px rgba(0,0,0,0.5)",
    keyText: "rgba(42,26,8,0.12)", border: "rgba(212,168,83,0.15)", topBorder: "rgba(212,168,83,0.25)",
    sound: { clickFreq: 5500, clickQ: 2.0, clickVol: 0.40, thumpStart: 380, thumpEnd: 90, thumpDecay: 0.04, thumpVol: 0.25 },
  },
  {
    id: "neon", name: "네온", dot: "#ff00ff",
    pageBg: "radial-gradient(ellipse at center,#0d0020 0%,#050010 100%)",
    keyBg: "linear-gradient(180deg,#2a0055 0%,#1e003d 100%)",
    keyDownBg: "linear-gradient(180deg,#150030 0%,#0d0020 100%)",
    keyShadow: "0 8px 0 #060010,0 0 12px rgba(200,0,255,0.5),inset 0 1px 0 rgba(255,0,255,0.2)",
    keyDownShadow: "0 2px 0 #040008,0 0 20px rgba(255,0,255,0.8),inset 0 2px 6px rgba(0,0,0,0.9)",
    keyText: "rgba(224,128,255,0.2)", border: "rgba(200,0,255,0.15)", topBorder: "rgba(255,0,255,0.15)",
    sound: { clickFreq: 6000, clickQ: 3.0, clickVol: 0.22, thumpStart: 800, thumpEnd: 200, thumpDecay: 0.03, thumpVol: 0.18 },
  },
];

// 키마다 살짝 다른 피치
const PITCH_MULTS = [1.3, 1.0, 0.8, 1.2, 1.0, 0.85, 1.15, 1.0, 0.9];

export default function KeycapPage() {
  const router = useRouter();
  const [pressed, setPressed] = useState<number | null>(null);
  const [themeIdx, setThemeIdx] = useState(0);
  const [showThemes, setShowThemes] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(true);
  const themeIdxRef = useRef(0);
  soundOnRef.current = soundOn;
  themeIdxRef.current = themeIdx;

  const T = THEMES[themeIdx];

  const pressKey = useCallback((idx: number) => {
    if (soundOnRef.current) {
      try {
        if (!audioCtxRef.current)
          audioCtxRef.current = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") ctx.resume();
        playClick(ctx, THEMES[themeIdxRef.current].sound, PITCH_MULTS[idx]);
      } catch (_) {}
    }
    setPressed(idx);
    setTimeout(() => setPressed(null), 130);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8 select-none"
      style={{ background: T.pageBg, padding: "32px 20px" }}
    >
      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        style={{
          alignSelf: "flex-start",
          padding: "8px 16px", borderRadius: 12, fontSize: 16, fontWeight: 700,
          background: T.keyBg, border: `1px solid ${T.border}`,
          boxShadow: T.keyShadow, cursor: "pointer",
          color: "rgba(255,255,255,0.5)",
        }}
      >←</button>

      {/* 9키 그리드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, width: "100%", maxWidth: 340 }}>
        {Array.from({ length: 9 }, (_, i) => {
          const isDown = pressed === i;
          return (
            <button
              key={i}
              onPointerDown={e => { e.preventDefault(); pressKey(i); }}
              style={{
                aspectRatio: "1",
                borderRadius: 20,
                background: isDown ? T.keyDownBg : T.keyBg,
                boxShadow: isDown ? T.keyDownShadow : T.keyShadow,
                border: `1px solid ${T.border}`,
                borderTop: `1px solid ${T.topBorder}`,
                cursor: "pointer",
                transform: isDown ? "translateY(6px)" : "translateY(0)",
                transition: "transform 0.07s, box-shadow 0.07s",
                userSelect: "none",
                WebkitUserSelect: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* 키캡 등록점 */}
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: T.keyText,
                transition: "opacity 0.07s",
                opacity: isDown ? 0.4 : 1,
              }} />
            </button>
          );
        })}
      </div>

      {/* 컨트롤 */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onPointerDown={e => e.preventDefault()}
          onClick={() => setSoundOn(v => !v)}
          style={{
            padding: "8px 16px", borderRadius: 12, fontSize: 16, fontWeight: 700,
            background: T.keyBg, border: `1px solid ${T.border}`,
            boxShadow: T.keyShadow, cursor: "pointer",
            color: soundOn ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)",
          }}
        >{soundOn ? "🔊" : "🔇"}</button>

        <button
          onPointerDown={e => e.preventDefault()}
          onClick={() => setShowThemes(v => !v)}
          style={{
            padding: "8px 16px", borderRadius: 12, fontSize: 12, fontWeight: 700,
            background: T.keyBg, border: `1px solid ${T.border}`,
            boxShadow: T.keyShadow, cursor: "pointer",
            color: "rgba(255,255,255,0.45)",
            display: "flex", alignItems: "center", gap: 7,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: T.dot, display: "inline-block", boxShadow: `0 0 8px ${T.dot}` }} />
          테마
        </button>
      </div>

      {/* 테마 패널 */}
      {showThemes && (
        <div style={{
          display: "flex", gap: 20, padding: "14px 24px", borderRadius: 20,
          background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
        }}>
          {THEMES.map((th, i) => (
            <button
              key={th.id}
              onPointerDown={e => e.preventDefault()}
              onClick={() => { setThemeIdx(i); setShowThemes(false); }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: themeIdx === i ? 1 : 0.45, background: "none", border: "none", cursor: "pointer" }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: th.dot,
                boxShadow: themeIdx === i ? `0 0 0 2.5px white,0 0 14px ${th.dot}` : `0 0 0 2px rgba(255,255,255,0.2)`,
                transform: themeIdx === i ? "scale(1.2)" : "scale(1)",
                transition: "all 0.15s",
              }} />
              <span style={{ fontSize: 10, color: themeIdx === i ? "white" : "rgba(255,255,255,0.4)", fontWeight: 700 }}>{th.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
