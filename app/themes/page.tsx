"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const THEMES = [
  { label: "☀️ 라이트",     value: "light",    bg: "#ffffff",                                          card: "rgba(255,255,255,0.85)", border: "rgba(0,0,0,0.1)" },
  { label: "🍊 와기 오렌지", value: "orange",   bg: "linear-gradient(135deg, #fff6ee, #fff0e0)",        card: "rgba(255,255,255,0.80)", border: "rgba(255,170,100,0.4)" },
  { label: "🌿 민트 글래스", value: "mint",     bg: "linear-gradient(135deg, #d4fff3, #eafff8)",        card: "rgba(255,255,255,0.35)", border: "rgba(120,255,200,0.4)" },
  { label: "🍑 피치 소프트", value: "peach",    bg: "linear-gradient(135deg, #ffe0d2, #fff3ec)",        card: "rgba(255,255,255,0.35)", border: "rgba(255,170,140,0.4)" },
  { label: "🌸 라벤더",      value: "lavender", bg: "linear-gradient(135deg, #eee6ff, #f8f5ff)",        card: "rgba(255,255,255,0.35)", border: "rgba(180,150,255,0.4)" },
  { label: "☁️ 스카이 블루", value: "sky",      bg: "linear-gradient(135deg, #dbeeff, #f5fbff)",        card: "rgba(255,255,255,0.35)", border: "rgba(120,180,255,0.4)" },
];

export default function ThemePage() {
  const router = useRouter();
  const [active, setActive] = useState("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const theme = THEMES.find((t) => t.value === (saved || "light"));
    if (theme) applyTheme(theme);
  }, []);

  const applyTheme = (t: typeof THEMES[0]) => {
    setActive(t.value);
    document.body.style.background = t.bg;
    document.documentElement.style.setProperty("--theme-card", t.card);
    document.documentElement.style.setProperty("--theme-border", t.border);
    localStorage.setItem("theme", t.value);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-[#fff6ee] via-[#fff0e0] to-[#fff8f0]" />

      <div className="relative z-10">
        <div className="flex items-center h-14 px-4 bg-white/60 backdrop-blur-md border-b border-orange-100 sticky top-0 z-20">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-400 font-bold text-lg mr-3">←</button>
          <span className="font-black text-[#3d1f00] text-base">🎨 테마 설정</span>
        </div>

        <div className="px-5 pt-6 pb-16 space-y-4">

          {/* 미리보기 */}
          <div className="rounded-[24px] overflow-hidden shadow-[0_12px_40px_rgba(255,160,50,0.3)]">
            <div className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 px-5 py-4 relative">
              <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.15)_50%,transparent_60%)] animate-[shimmer_3s_infinite]" />
              <p className="relative text-white/80 text-xs font-black tracking-widest">PREVIEW</p>
              <p className="relative text-white font-black text-lg mt-1">선택한 테마가 즉시 반영돼요</p>
            </div>
            <div className="px-5 py-4 bg-white/80 backdrop-blur-sm border border-orange-100 flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-200 to-amber-200 flex items-center justify-center text-xl">🎨</div>
              <div>
                <p className="font-black text-[#3d1f00] text-sm">테마 미리보기</p>
                <p className="text-[#c09070] text-xs">배경 색상이 바뀌어요</p>
              </div>
            </div>
          </div>

          {/* 테마 목록 */}
          <p className="font-black text-[#3d1f00] text-base px-1">테마 선택</p>
          <div className="space-y-2">
            {THEMES.map((t) => (
              <button key={t.value} onClick={() => applyTheme(t)}
                className={`w-full rounded-[20px] px-5 py-4 flex items-center justify-between transition-all active:scale-[0.98] border shadow-sm
                  ${active === t.value
                    ? "bg-gradient-to-r from-orange-400 to-amber-300 border-transparent shadow-[0_6px_20px_rgba(255,160,50,0.35)]"
                    : "bg-white/80 backdrop-blur-sm border-orange-100"
                  }`}>
                <span className={`font-black text-base ${active === t.value ? "text-white" : "text-[#3d1f00]"}`}>{t.label}</span>
                {active === t.value && <span className="text-white text-lg">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </main>
  );
}
