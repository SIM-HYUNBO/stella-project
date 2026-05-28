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

export default function FontSettings() {
  const { font, changeFont } = useFont();
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gray-50" />

      <div className="relative z-10">
        <div className="flex items-center h-14 px-4 bg-white border-b border-gray-100 sticky top-0 z-20">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-400 font-bold text-lg mr-3">←</button>
          <span className="font-black text-[#3d1f00] text-base">⚙️ 폰트 설정</span>
        </div>

        <div className="px-5 pt-6 pb-16 space-y-3">
          <p className="font-black text-[#3d1f00] text-base px-1 mb-4">폰트 선택</p>

          {FONT_OPTIONS.map((f) => {
            const isActive = font === f.value;
            return (
              <button key={f.value} onClick={() => changeFont(f.value)}
                className={`w-full rounded-[20px] px-5 py-4 flex items-center justify-between transition-all active:scale-[0.98] border shadow-sm
                  ${isActive
                    ? "bg-gradient-to-r from-orange-400 to-amber-300 border-transparent shadow-[0_6px_20px_rgba(255,160,50,0.35)]"
                    : "bg-white/80 backdrop-blur-sm border-orange-100"
                  }`}>
                <div className="text-left">
                  <p className={`font-black text-sm ${isActive ? "text-white" : "text-[#3d1f00]"}`}>{f.label}</p>
                  <p className={`text-xs mt-0.5 ${isActive ? "text-white/75" : "text-[#c09070]"}`}
                    style={{ fontFamily: f.value }}>{f.preview}</p>
                </div>
                {isActive && <span className="text-white text-lg">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
