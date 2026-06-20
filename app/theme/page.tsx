"use client";

import { useRouter } from "next/navigation";
import { useSeason, SeasonName } from "../SeasonContext";

const THEMES: {
  id: SeasonName;
  label: string;
  emoji: string;
  desc: string;
  fromColor: string;
  toColor: string;
  swatches: string[];
}[] = [
  {
    id: "default",
    label: "기본",
    emoji: "🌤️",
    desc: "하늘과 햇살",
    fromColor: "#bae6fd",
    toColor: "#e0f2fe",
    swatches: ["#38bdf8", "#7dd3fc", "#facc15", "#fb923c"],
  },
  {
    id: "spring",
    label: "봄",
    emoji: "🌸",
    desc: "벚꽃과 새싹",
    fromColor: "#e879f9",
    toColor: "#f0abfc",
    swatches: ["#f472b6", "#f9a8d4", "#4ade80", "#c084fc"],
  },
  {
    id: "summer",
    label: "여름",
    emoji: "🌊",
    desc: "파도와 태양",
    fromColor: "#22d3ee",
    toColor: "#67e8f9",
    swatches: ["#06b6d4", "#22d3ee", "#f59e0b", "#10b981"],
  },
  {
    id: "autumn",
    label: "가을",
    emoji: "🍂",
    desc: "단풍과 낙엽",
    fromColor: "#f97316",
    toColor: "#fdba74",
    swatches: ["#ea580c", "#fb923c", "#dc2626", "#d97706"],
  },
  {
    id: "winter",
    label: "겨울",
    emoji: "❄️",
    desc: "눈과 별빛",
    fromColor: "#6366f1",
    toColor: "#a5b4fc",
    swatches: ["#4f46e5", "#818cf8", "#3b82f6", "#7c3aed"],
  },
];

export default function ThemePage() {
  const router = useRouter();
  const { season, changeSeason } = useSeason();

  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 transition-colors duration-400" style={{ backgroundColor: "var(--theme-bg)" }} />

      <div className="relative z-10">
        <div className="flex items-center h-14 px-4 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-50 text-sky-600 font-bold text-lg mr-3">←</button>
          <span className="font-black text-slate-800 text-base">🎨 테마</span>
        </div>

        <div className="px-5 pt-5 pb-20 space-y-3">
          <p className="text-xs text-slate-400 px-1 mb-4">계절별로 앱 전체 색상이 바뀌어요 ✨</p>

          {/* 기본 테마 - 풀 너비 */}
          {(() => {
            const t = THEMES[0];
            const isActive = season === t.id;
            return (
              <button
                onClick={() => changeSeason(t.id)}
                className={`w-full rounded-[24px] overflow-hidden text-left active:scale-[0.98] transition-transform ${isActive ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}
              >
                <div
                  className="px-6 py-5 flex items-center gap-5"
                  style={{ background: `linear-gradient(135deg, ${t.fromColor}, ${t.toColor})` }}
                >
                  <span className="text-5xl">{t.emoji}</span>
                  <div className="flex-1">
                    <p className="font-black text-white text-lg drop-shadow">{t.label}</p>
                    <p className="text-white/70 text-sm">{t.desc}</p>
                    <div className="flex gap-1.5 mt-2">
                      {t.swatches.map((c) => (
                        <div key={c} className="w-5 h-5 rounded-full border-2 border-white/60 shadow-sm" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow shrink-0">
                      <span className="text-slate-700 text-sm font-black">✓</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })()}

          {/* 4계절 - 2×2 그리드 */}
          <div className="grid grid-cols-2 gap-3">
            {THEMES.slice(1).map((t) => {
              const isActive = season === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => changeSeason(t.id)}
                  className={`rounded-[24px] overflow-hidden text-left active:scale-[0.97] transition-transform ${isActive ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}
                >
                  <div
                    className="p-5 h-[150px] flex flex-col justify-between"
                    style={{ background: `linear-gradient(135deg, ${t.fromColor}, ${t.toColor})` }}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-4xl">{t.emoji}</span>
                      {isActive && (
                        <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow">
                          <span className="text-slate-700 text-xs font-black">✓</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {t.swatches.map((c) => (
                        <div key={c} className="w-5 h-5 rounded-full border-2 border-white/60 shadow-sm" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/90 backdrop-blur-sm px-4 py-3">
                    <p className="font-black text-slate-800 text-sm">{t.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
