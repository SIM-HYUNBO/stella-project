"use client";

import { useRouter } from "next/navigation";
import { useFont } from "../FontContext";

const FONT_OPTIONS = [
  { label: "기본 (Geist)",     value: "var(--font-geist)", preview: "안녕하세요 WAGIE" },
  { label: "Noto Sans KR",     value: "var(--font-noto)",  preview: "안녕하세요 WAGIE" },
  { label: "JetBrains Mono",   value: "var(--font-mono)",  preview: "안녕하세요 WAGIE" },
  { label: "도현",              value: "var(--font-dohyeon)",preview: "안녕하세요 WAGIE" },
  { label: "브러시 감성",       value: "var(--font-brush)", preview: "안녕하세요 WAGIE" },
];

const SIZE_OPTIONS = [
  { label: "작게",     value: 13 },
  { label: "보통",     value: 16 },
  { label: "크게",     value: 19 },
  { label: "아주 크게", value: 22 },
];

export default function FontSettings() {
  const { font, changeFont, fontSize, changeFontSize } = useFont();
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-[#FFFBF0]" />

      <div className="relative z-10">
        <div className="flex items-center h-14 px-4 bg-white sticky top-0 z-20">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold text-lg mr-3">←</button>
          <span className="font-black text-stone-800 text-base">⚙️ 폰트 설정</span>
        </div>

        <div className="px-5 pt-6 pb-16 space-y-6">

          {/* 글씨 크기 */}
          <div>
            <p className="font-black text-stone-800 text-base px-1 mb-3">글씨 크기</p>
            <div className="grid grid-cols-4 gap-2">
              {SIZE_OPTIONS.map((s) => {
                const isActive = fontSize === s.value;
                return (
                  <button key={s.value} onClick={() => changeFontSize(s.value)}
                    className={`rounded-[16px] py-3 flex flex-col items-center gap-1 border transition-all active:scale-[0.97]
                      ${isActive
                        ? "bg- border-transparent"
                        : "bg-white border-amber-100"
                      }`}>
                    <span style={{ fontSize: s.value }} className={`font-bold leading-none ${isActive ? "text-white" : "text-stone-800"}`}>가</span>
                    <span className={`text-[10px] font-medium ${isActive ? "text-white/80" : "text-amber-700"}`}>{s.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 rounded-[14px] bg-white px-4 py-3 text-center text-[#b08060]" style={{ fontSize }}>
              미리보기 — 안녕하세요 WAGIE 🧡
            </div>
          </div>

          {/* 폰트 종류 */}
          <div>
            <p className="font-black text-stone-800 text-base px-1 mb-3">폰트 선택</p>
            <div className="space-y-3">
              {FONT_OPTIONS.map((f) => {
                const isActive = font === f.value;
                return (
                  <button key={f.value} onClick={() => changeFont(f.value)}
                    className={`w-full rounded-[20px] px-5 py-4 flex items-center justify-between transition-all active:scale-[0.98] border
                      ${isActive
                        ? "bg-amber-100 border-transparent"
                        : "bg-white/80 backdrop-blur-sm border-amber-100"
                      }`}>
                    <div className="text-left">
                      <p className={`font-black text-sm ${isActive ? "text-white" : "text-stone-800"}`}>{f.label}</p>
                      <p className={`text-xs mt-0.5 ${isActive ? "text-white/75" : "text-amber-700"}`}
                        style={{ fontFamily: f.value }}>{f.preview}</p>
                    </div>
                    {isActive && <span className="text-white text-lg">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
