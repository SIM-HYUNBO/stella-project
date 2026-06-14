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
  border: string; topBorder: string;
  iconColor: string; btnColor: string;
  sound: SoundParams;
};

const THEMES: ThemeDef[] = [
  {
    id: "dark", name: "다크", dot: "#888",
    pageBg: "radial-gradient(ellipse at center,#1e1e2e 0%,#0d0d0d 100%)",
    keyBg: "linear-gradient(180deg,#525252 0%,#424242 100%)",
    keyDownBg: "linear-gradient(180deg,#363636 0%,#2e2e2e 100%)",
    keyShadow: "0 8px 0 #0a0a0a,inset 0 1px 0 rgba(255,255,255,0.1)",
    keyDownShadow: "0 2px 0 #080808,inset 0 2px 6px rgba(0,0,0,0.7)",
    border: "rgba(255,255,255,0.06)", topBorder: "rgba(255,255,255,0.1)",
    iconColor: "rgba(255,255,255,0.55)", btnColor: "rgba(255,255,255,0.6)",
    sound: { clickFreq: 3500, clickQ: 1.0, clickVol: 0.28, thumpStart: 240, thumpEnd: 65, thumpDecay: 0.055, thumpVol: 0.20 },
  },
  {
    id: "light", name: "라이트", dot: "#b0aba0",
    pageBg: "linear-gradient(135deg,#f0ede8 0%,#ddd8d0 100%)",
    keyBg: "linear-gradient(180deg,#faf8f5 0%,#eae7e2 100%)",
    keyDownBg: "linear-gradient(180deg,#e0ddd8 0%,#d0cdc8 100%)",
    keyShadow: "0 8px 0 #999,inset 0 1px 0 rgba(255,255,255,0.8)",
    keyDownShadow: "0 2px 0 #aaa,inset 0 2px 6px rgba(0,0,0,0.2)",
    border: "rgba(0,0,0,0.08)", topBorder: "rgba(255,255,255,0.7)",
    iconColor: "rgba(60,50,40,0.4)", btnColor: "rgba(60,50,40,0.7)",
    sound: { clickFreq: 2200, clickQ: 0.6, clickVol: 0.16, thumpStart: 160, thumpEnd: 50, thumpDecay: 0.07, thumpVol: 0.13 },
  },
  {
    id: "ocean", name: "오션", dot: "#0ea5e9",
    pageBg: "radial-gradient(ellipse at center,#0c1a2e 0%,#060e1a 100%)",
    keyBg: "linear-gradient(180deg,#163552 0%,#0e2540 100%)",
    keyDownBg: "linear-gradient(180deg,#0c2038 0%,#091828 100%)",
    keyShadow: "0 8px 0 #041020,inset 0 1px 0 rgba(14,165,233,0.2)",
    keyDownShadow: "0 2px 0 #030c18,inset 0 2px 6px rgba(0,0,0,0.8)",
    border: "rgba(14,165,233,0.12)", topBorder: "rgba(14,165,233,0.15)",
    iconColor: "rgba(100,200,255,0.6)", btnColor: "rgba(100,200,255,0.7)",
    sound: { clickFreq: 1800, clickQ: 0.5, clickVol: 0.12, thumpStart: 130, thumpEnd: 40, thumpDecay: 0.09, thumpVol: 0.10 },
  },
  {
    id: "retro", name: "레트로", dot: "#d4a853",
    pageBg: "linear-gradient(135deg,#2a1a08 0%,#1a1008 100%)",
    keyBg: "linear-gradient(180deg,#c8a870 0%,#b89060 100%)",
    keyDownBg: "linear-gradient(180deg,#a08050 0%,#907040 100%)",
    keyShadow: "0 8px 0 #3a2810,inset 0 1px 0 rgba(255,220,150,0.3)",
    keyDownShadow: "0 2px 0 #2a1808,inset 0 2px 6px rgba(0,0,0,0.5)",
    border: "rgba(212,168,83,0.15)", topBorder: "rgba(212,168,83,0.25)",
    iconColor: "rgba(42,26,8,0.4)", btnColor: "rgba(42,26,8,0.65)",
    sound: { clickFreq: 5500, clickQ: 2.0, clickVol: 0.40, thumpStart: 380, thumpEnd: 90, thumpDecay: 0.04, thumpVol: 0.25 },
  },
  {
    id: "neon", name: "네온", dot: "#ff00ff",
    pageBg: "radial-gradient(ellipse at center,#0d0020 0%,#050010 100%)",
    keyBg: "linear-gradient(180deg,#2a0055 0%,#1e003d 100%)",
    keyDownBg: "linear-gradient(180deg,#150030 0%,#0d0020 100%)",
    keyShadow: "0 8px 0 #060010,0 0 12px rgba(200,0,255,0.5),inset 0 1px 0 rgba(255,0,255,0.2)",
    keyDownShadow: "0 2px 0 #040008,0 0 20px rgba(255,0,255,0.8),inset 0 2px 6px rgba(0,0,0,0.9)",
    border: "rgba(200,0,255,0.15)", topBorder: "rgba(255,0,255,0.15)",
    iconColor: "rgba(255,100,255,0.65)", btnColor: "rgba(255,100,255,0.7)",
    sound: { clickFreq: 6000, clickQ: 3.0, clickVol: 0.22, thumpStart: 800, thumpEnd: 200, thumpDecay: 0.03, thumpVol: 0.18 },
  },
];

const PITCH_MULTS = [1.3, 1.0, 0.8, 1.2, 1.0, 0.85, 1.15, 1.0, 0.9];

function KeyIcon({ idx, color }: { idx: number; color: string }) {
  const s = 38;
  const sw = 1.8;
  const props = { stroke: color, strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

  const icons = [
    // 0: 별
    <svg width={s} height={s} viewBox="0 0 24 24" key="star">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" {...props}/>
    </svg>,
    // 1: 하트
    <svg width={s} height={s} viewBox="0 0 24 24" key="heart">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" {...props}/>
    </svg>,
    // 2: 달
    <svg width={s} height={s} viewBox="0 0 24 24" key="moon">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" {...props}/>
    </svg>,
    // 3: 해
    <svg width={s} height={s} viewBox="0 0 24 24" key="sun">
      <circle cx="12" cy="12" r="4" {...props}/>
      {[[12,2,12,4],[12,20,12,22],[2,12,4,12],[20,12,22,12],[5.6,5.6,7,7],[17,17,18.4,18.4],[5.6,18.4,7,17],[17,7,18.4,5.6]].map(([x1,y1,x2,y2],i) =>
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} {...props}/>
      )}
    </svg>,
    // 4: 구름
    <svg width={s} height={s} viewBox="0 0 24 24" key="cloud">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" {...props}/>
    </svg>,
    // 5: 번개
    <svg width={s} height={s} viewBox="0 0 24 24" key="bolt">
      <polyline points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" {...props}/>
    </svg>,
    // 6: 왕관
    <svg width={s} height={s} viewBox="0 0 24 24" key="crown">
      <path d="M3 20h18" {...props}/>
      <path d="M4 20V9l4 4 4-7 4 7 4-4v11" {...props}/>
    </svg>,
    // 7: 다이아
    <svg width={s} height={s} viewBox="0 0 24 24" key="gem">
      <path d="M6 3h12l4 6-10 12L2 9z" {...props}/>
      <line x1="2" y1="9" x2="22" y2="9" {...props}/>
      <line x1="12" y1="3" x2="6" y2="9" {...props}/>
      <line x1="12" y1="3" x2="18" y2="9" {...props}/>
    </svg>,
    // 8: 꽃
    <svg width={s} height={s} viewBox="0 0 24 24" key="flower">
      <circle cx="12" cy="12" r="2.5" {...props}/>
      <ellipse cx="12" cy="6.5" rx="2" ry="3" {...props}/>
      <ellipse cx="12" cy="17.5" rx="2" ry="3" {...props}/>
      <ellipse cx="6.5" cy="12" rx="3" ry="2" {...props}/>
      <ellipse cx="17.5" cy="12" rx="3" ry="2" {...props}/>
    </svg>,
  ];

  return icons[idx] ?? null;
}

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

  const btnStyle = {
    padding: "8px 16px", borderRadius: 12, fontSize: 15, fontWeight: 700,
    background: T.keyBg, border: `1px solid ${T.border}`,
    boxShadow: T.keyShadow, cursor: "pointer", color: T.btnColor,
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8 select-none"
      style={{ background: T.pageBg, padding: "32px 20px" }}
    >
      {/* 뒤로가기 - 왼쪽 위 고정 */}
      <button
        onClick={() => router.back()}
        style={{ ...btnStyle, position: "fixed", top: 16, left: 16, zIndex: 10 }}
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
              <KeyIcon idx={i} color={T.iconColor} />
            </button>
          );
        })}
      </div>

      {/* 컨트롤 */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onPointerDown={e => e.preventDefault()}
          onClick={() => setSoundOn(v => !v)}
          style={{ ...btnStyle, opacity: soundOn ? 1 : 0.35 }}
        >{soundOn ? "🔊" : "🔇"}</button>

        <button
          onPointerDown={e => e.preventDefault()}
          onClick={() => setShowThemes(v => !v)}
          style={{ ...btnStyle, display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}
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
