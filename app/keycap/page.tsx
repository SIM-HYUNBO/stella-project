"use client";
import { useState, useCallback, useRef } from "react";

// ── 사운드 ────────────────────────────────────────────────────────────────────
type SoundParams = {
  clickFreq: number; clickQ: number; clickVol: number;
  thumpStart: number; thumpEnd: number; thumpDecay: number; thumpVol: number;
};

function playClick(ctx: AudioContext, s: SoundParams) {
  const now = ctx.currentTime;
  const dur = 0.004;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.4));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bpf = ctx.createBiquadFilter(); bpf.type = "bandpass"; bpf.frequency.value = s.clickFreq; bpf.Q.value = s.clickQ;
  const ng = ctx.createGain(); ng.gain.setValueAtTime(s.clickVol, now); ng.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(bpf); bpf.connect(ng); ng.connect(ctx.destination); src.start(now);

  const osc = ctx.createOscillator(); osc.type = "sine";
  osc.frequency.setValueAtTime(s.thumpStart, now);
  osc.frequency.exponentialRampToValueAtTime(s.thumpEnd, now + s.thumpDecay);
  const og = ctx.createGain(); og.gain.setValueAtTime(s.thumpVol, now); og.gain.exponentialRampToValueAtTime(0.0001, now + s.thumpDecay + 0.01);
  osc.connect(og); og.connect(ctx.destination); osc.start(now); osc.stop(now + s.thumpDecay + 0.02);
}

// ── 테마 ──────────────────────────────────────────────────────────────────────
type ThemeDef = {
  id: string; name: string; dot: string;
  pageBg: string;
  keyBg: string; keyDownBg: string;
  keyShadow: string; keyDownShadow: string;
  keyText: string; border: string; topBorder: string;
  dispBg: string; dispText: string; dispBorder: string;
  dispCursor: string; dispPlaceholder: string;
  sound: SoundParams;
};

const THEMES: ThemeDef[] = [
  {
    id: "dark", name: "다크", dot: "#555",
    pageBg: "radial-gradient(ellipse at center,#1e1e2e 0%,#0d0d0d 100%)",
    keyBg: "linear-gradient(180deg,#525252 0%,#424242 100%)",
    keyDownBg: "linear-gradient(180deg,#363636 0%,#2e2e2e 100%)",
    keyShadow: "0 6px 0 #0a0a0a,inset 0 1px 0 rgba(255,255,255,0.1)",
    keyDownShadow: "0 2px 0 #080808,inset 0 2px 4px rgba(0,0,0,0.6)",
    keyText: "#d0d0d0", border: "rgba(255,255,255,0.06)", topBorder: "rgba(255,255,255,0.08)",
    dispBg: "#060608", dispText: "#a0ffb0", dispBorder: "#2a2a3a",
    dispCursor: "#a0ffb0", dispPlaceholder: "#2a3a2a",
    sound: { clickFreq: 3500, clickQ: 1.0, clickVol: 0.28, thumpStart: 240, thumpEnd: 65, thumpDecay: 0.055, thumpVol: 0.20 },
  },
  {
    id: "light", name: "라이트", dot: "#d4d0c8",
    pageBg: "linear-gradient(135deg,#f0ede8 0%,#ddd8d0 100%)",
    keyBg: "linear-gradient(180deg,#faf8f5 0%,#eae7e2 100%)",
    keyDownBg: "linear-gradient(180deg,#e0ddd8 0%,#d0cdc8 100%)",
    keyShadow: "0 6px 0 #999,inset 0 1px 0 rgba(255,255,255,0.8)",
    keyDownShadow: "0 2px 0 #aaa,inset 0 2px 4px rgba(0,0,0,0.15)",
    keyText: "#2a2a2a", border: "rgba(0,0,0,0.08)", topBorder: "rgba(255,255,255,0.6)",
    dispBg: "#f8f6f2", dispText: "#1a1a2a", dispBorder: "#c8c4bc",
    dispCursor: "#4a6a9a", dispPlaceholder: "#b8b4ac",
    sound: { clickFreq: 2200, clickQ: 0.6, clickVol: 0.16, thumpStart: 160, thumpEnd: 50, thumpDecay: 0.07, thumpVol: 0.13 },
  },
  {
    id: "ocean", name: "오션", dot: "#0ea5e9",
    pageBg: "radial-gradient(ellipse at center,#0c1a2e 0%,#060e1a 100%)",
    keyBg: "linear-gradient(180deg,#163552 0%,#0e2540 100%)",
    keyDownBg: "linear-gradient(180deg,#0c2038 0%,#091828 100%)",
    keyShadow: "0 6px 0 #041020,inset 0 1px 0 rgba(14,165,233,0.2)",
    keyDownShadow: "0 2px 0 #030c18,inset 0 2px 4px rgba(0,0,0,0.7)",
    keyText: "#7dd3fc", border: "rgba(14,165,233,0.12)", topBorder: "rgba(14,165,233,0.15)",
    dispBg: "#040c18", dispText: "#38bdf8", dispBorder: "#0e3560",
    dispCursor: "#38bdf8", dispPlaceholder: "#0e3560",
    sound: { clickFreq: 1800, clickQ: 0.5, clickVol: 0.12, thumpStart: 130, thumpEnd: 40, thumpDecay: 0.09, thumpVol: 0.10 },
  },
  {
    id: "retro", name: "레트로", dot: "#d4a853",
    pageBg: "linear-gradient(135deg,#2a1a08 0%,#1a1008 100%)",
    keyBg: "linear-gradient(180deg,#c8a870 0%,#b89060 100%)",
    keyDownBg: "linear-gradient(180deg,#a08050 0%,#907040 100%)",
    keyShadow: "0 6px 0 #3a2810,inset 0 1px 0 rgba(255,220,150,0.3)",
    keyDownShadow: "0 2px 0 #2a1808,inset 0 2px 4px rgba(0,0,0,0.4)",
    keyText: "#2a1a08", border: "rgba(212,168,83,0.15)", topBorder: "rgba(212,168,83,0.2)",
    dispBg: "#120c04", dispText: "#d4a853", dispBorder: "#6a4a28",
    dispCursor: "#d4a853", dispPlaceholder: "#4a3010",
    sound: { clickFreq: 5500, clickQ: 2.0, clickVol: 0.40, thumpStart: 380, thumpEnd: 90, thumpDecay: 0.04, thumpVol: 0.25 },
  },
  {
    id: "neon", name: "네온", dot: "#ff00ff",
    pageBg: "radial-gradient(ellipse at center,#0d0020 0%,#050010 100%)",
    keyBg: "linear-gradient(180deg,#2a0055 0%,#1e003d 100%)",
    keyDownBg: "linear-gradient(180deg,#150030 0%,#0d0020 100%)",
    keyShadow: "0 6px 0 #060010,0 0 10px rgba(200,0,255,0.4),inset 0 1px 0 rgba(255,0,255,0.2)",
    keyDownShadow: "0 2px 0 #040008,0 0 16px rgba(255,0,255,0.7),inset 0 2px 4px rgba(0,0,0,0.8)",
    keyText: "#e080ff", border: "rgba(200,0,255,0.15)", topBorder: "rgba(255,0,255,0.12)",
    dispBg: "#08001a", dispText: "#ff60ff", dispBorder: "#3d0080",
    dispCursor: "#ff00ff", dispPlaceholder: "#3d0060",
    sound: { clickFreq: 6000, clickQ: 3.0, clickVol: 0.22, thumpStart: 800, thumpEnd: 200, thumpDecay: 0.03, thumpVol: 0.18 },
  },
];

// ── 9키 레이아웃 ──────────────────────────────────────────────────────────────
const KEYS = ["7","8","9","4","5","6","1","2","3"];

export default function KeycapPage() {
  const [text, setText] = useState("");
  const [pressed, setPressed] = useState<string | null>(null);
  const [themeIdx, setThemeIdx] = useState(0);
  const [showThemes, setShowThemes] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(true);
  const themeIdxRef = useRef(0);
  soundOnRef.current = soundOn;
  themeIdxRef.current = themeIdx;

  const T = THEMES[themeIdx];

  const fireClick = useCallback(() => {
    if (!soundOnRef.current) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      playClick(ctx, THEMES[themeIdxRef.current].sound);
    } catch (_) {}
  }, []);

  const pressKey = useCallback((key: string) => {
    fireClick();
    setPressed(key);
    setTimeout(() => setPressed(null), 120);
    setText(t => t + key);
  }, [fireClick]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5 p-5 select-none"
      style={{ background: T.pageBg }}
    >
      {/* 디스플레이 */}
      <div style={{
        width: "100%", maxWidth: 360,
        background: T.dispBg,
        border: `1px solid ${T.dispBorder}`,
        borderRadius: 16,
        padding: "14px 18px",
        minHeight: 64,
        fontFamily: "monospace",
        fontSize: 22,
        fontWeight: 700,
        color: T.dispText,
        boxShadow: `inset 0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.3)`,
        letterSpacing: 2,
        wordBreak: "break-all",
      }}>
        {text || <span style={{ color: T.dispPlaceholder, fontWeight: 400, fontSize: 15 }}>눌러봐...</span>}
        <span style={{
          display: "inline-block", width: 2, height: "1em",
          background: T.dispCursor, marginLeft: 3,
          verticalAlign: "text-bottom",
          boxShadow: `0 0 6px ${T.dispCursor}`,
          animation: "kc-blink 1s step-end infinite",
        }} />
      </div>

      {/* 9키 그리드 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 14,
        width: "100%",
        maxWidth: 360,
      }}>
        {KEYS.map(k => {
          const isDown = pressed === k;
          return (
            <button
              key={k}
              onPointerDown={e => { e.preventDefault(); pressKey(k); }}
              style={{
                aspectRatio: "1",
                borderRadius: 18,
                background: isDown ? T.keyDownBg : T.keyBg,
                boxShadow: isDown ? T.keyDownShadow : T.keyShadow,
                border: `1px solid ${T.border}`,
                borderTop: `1px solid ${T.topBorder}`,
                color: T.keyText,
                fontSize: 32,
                fontWeight: 900,
                cursor: "pointer",
                transform: isDown ? "translateY(5px)" : "translateY(0)",
                transition: "transform 0.07s, box-shadow 0.07s, background 0.07s",
                userSelect: "none",
                WebkitUserSelect: "none",
                textShadow: `0 1px 3px rgba(0,0,0,0.5)`,
              }}
            >
              {k}
            </button>
          );
        })}
      </div>

      {/* 지우기 + 컨트롤 */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", maxWidth: 360, justifyContent: "space-between" }}>
        <button
          onPointerDown={e => { e.preventDefault(); setText(t => t.slice(0, -1)); }}
          style={{
            padding: "8px 18px", borderRadius: 12, fontSize: 18, fontWeight: 700,
            background: T.keyBg, color: T.keyText,
            border: `1px solid ${T.border}`,
            boxShadow: T.keyShadow,
            cursor: "pointer",
          }}
        >⌫</button>

        <button
          onPointerDown={e => e.preventDefault()}
          onClick={() => setText("")}
          style={{ fontSize: 12, color: T.keyText, opacity: 0.4, cursor: "pointer", background: "none", border: "none" }}
        >전체 지우기</button>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onPointerDown={e => e.preventDefault()}
            onClick={() => setSoundOn(v => !v)}
            style={{
              padding: "8px 12px", borderRadius: 12, fontSize: 15, fontWeight: 700,
              background: T.keyBg, color: T.keyText,
              border: `1px solid ${T.border}`,
              boxShadow: T.keyShadow,
              cursor: "pointer",
            }}
          >{soundOn ? "🔊" : "🔇"}</button>

          <button
            onPointerDown={e => e.preventDefault()}
            onClick={() => setShowThemes(v => !v)}
            style={{
              padding: "8px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700,
              background: T.keyBg, color: T.keyText,
              border: `1px solid ${T.border}`,
              boxShadow: T.keyShadow,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: T.dot, display: "inline-block", boxShadow: `0 0 6px ${T.dot}` }} />
            테마
          </button>
        </div>
      </div>

      {/* 테마 패널 */}
      {showThemes && (
        <div style={{
          display: "flex", gap: 20, padding: "14px 24px",
          borderRadius: 20,
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.08)",
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

      <style>{`@keyframes kc-blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}
