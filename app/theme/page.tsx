"use client";

import { useRouter } from "next/navigation";
import { useSeason, SeasonName } from "../SeasonContext";

type ThemeDef = {
  id: SeasonName;
  label: string;
  labelEn: string;
  emoji: string;
  desc: string;
  tags: string[];
  from: string;
  to: string;
  dir: string;
  accent: string;
  swatches: string[];
};

const THEMES: ThemeDef[] = [
  {
    id: "default",
    label: "기본",
    labelEn: "Default",
    emoji: "🌤️",
    desc: "맑고 깨끗한 하늘 아래",
    tags: ["맑음", "청명", "깔끔"],
    from: "#bae6fd",
    to: "#fef9c3",
    dir: "135deg",
    accent: "#38bdf8",
    swatches: ["#38bdf8", "#7dd3fc", "#facc15", "#fb923c"],
  },
  {
    id: "spring",
    label: "봄",
    labelEn: "Spring",
    emoji: "🌸",
    desc: "벚꽃이 흩날리는 봄날",
    tags: ["벚꽃", "따뜻함", "새싹"],
    from: "#f0abfc",
    to: "#86efac",
    dir: "140deg",
    accent: "#d946ef",
    swatches: ["#f472b6", "#c084fc", "#4ade80", "#f9a8d4"],
  },
  {
    id: "summer",
    label: "여름",
    labelEn: "Summer",
    emoji: "🌊",
    desc: "파도가 밀려오는 여름",
    tags: ["바다", "시원함", "활기"],
    from: "#22d3ee",
    to: "#fbbf24",
    dir: "125deg",
    accent: "#06b6d4",
    swatches: ["#06b6d4", "#22d3ee", "#f59e0b", "#10b981"],
  },
  {
    id: "autumn",
    label: "가을",
    labelEn: "Autumn",
    emoji: "🍂",
    desc: "단풍이 물드는 가을",
    tags: ["단풍", "포근함", "낙엽"],
    from: "#f97316",
    to: "#dc2626",
    dir: "150deg",
    accent: "#f97316",
    swatches: ["#ea580c", "#fb923c", "#dc2626", "#d97706"],
  },
  {
    id: "winter",
    label: "겨울",
    labelEn: "Winter",
    emoji: "❄️",
    desc: "눈 내리는 고요한 밤",
    tags: ["눈송이", "고요함", "별빛"],
    from: "#818cf8",
    to: "#38bdf8",
    dir: "135deg",
    accent: "#6366f1",
    swatches: ["#4f46e5", "#818cf8", "#3b82f6", "#7c3aed"],
  },
];

export default function ThemePage() {
  const router = useRouter();
  const { season, changeSeason } = useSeason();

  const current = THEMES.find((t) => t.id === season) ?? THEMES[0];

  return (
    <main className="relative min-h-screen transition-colors duration-500" style={{ backgroundColor: "var(--theme-bg)" }}>
      {/* 헤더 */}
      <div
        className="flex items-center h-14 px-4 sticky top-0 z-20 backdrop-blur-md border-b"
        style={{
          backgroundColor: "color-mix(in srgb, var(--theme-bg) 80%, transparent)",
          borderColor: "color-mix(in srgb, var(--theme-accent) 20%, transparent)",
        }}
      >
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl font-bold text-lg mr-3 transition-all"
          style={{ backgroundColor: "var(--theme-accent-soft)", color: "var(--theme-accent-text)" }}
        >
          ←
        </button>
        <span className="font-black text-slate-800 text-base flex-1">🎨 테마</span>
        {/* 현재 테마 배지 */}
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black"
          style={{ backgroundColor: "var(--theme-accent)", color: "#fff" }}
        >
          <span>{current.emoji}</span>
          <span>{current.label}</span>
        </div>
      </div>

      <div className="px-4 pt-5 pb-24 space-y-4">
        <p className="text-xs px-1 font-bold" style={{ color: "var(--theme-accent-text)", opacity: 0.7 }}>
          계절마다 앱 전체 색감과 파티클이 바뀌어요 ✨
        </p>

        {/* 기본 테마 - 풀 너비 */}
        {(() => {
          const t = THEMES[0];
          const isActive = season === t.id;
          return (
            <button
              onClick={() => changeSeason(t.id)}
              className="w-full rounded-[22px] overflow-hidden text-left transition-all duration-200 active:scale-[0.98]"
              style={
                isActive
                  ? { boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${t.accent}` }
                  : { boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }
              }
            >
              {/* 그라디언트 영역 */}
              <div
                className="relative overflow-hidden px-6 py-5 flex items-center gap-5"
                style={{ background: `linear-gradient(${t.dir}, ${t.from}, ${t.to})` }}
              >
                {/* 배경 장식 원 */}
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-20" style={{ backgroundColor: t.accent }} />
                <div className="absolute -right-2 -bottom-4 w-16 h-16 rounded-full opacity-15" style={{ backgroundColor: t.swatches[2] }} />

                <span className="text-6xl relative z-10 drop-shadow">{t.emoji}</span>
                <div className="flex-1 relative z-10">
                  <p className="font-black text-slate-700 text-2xl">{t.label}</p>
                  <p className="text-slate-500 text-sm mt-0.5">{t.labelEn} · {t.desc}</p>
                  <div className="flex gap-1.5 mt-3">
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: "rgba(255,255,255,0.55)", color: "#334155", backdropFilter: "blur(4px)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                {isActive && (
                  <div
                    className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center shrink-0 relative z-10"
                  >
                    <span className="text-sm font-black" style={{ color: t.accent }}>✓</span>
                  </div>
                )}
              </div>
              {/* 컬러 바 */}
              <div className="flex h-2">
                {t.swatches.map((c) => (
                  <div key={c} className="flex-1" style={{ backgroundColor: c }} />
                ))}
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
                className="rounded-[22px] overflow-hidden text-left transition-all duration-200 active:scale-95"
                style={
                  isActive
                    ? { boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${t.accent}` }
                    : { boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }
                }
              >
                {/* 그라디언트 영역 */}
                <div
                  className="relative h-[175px] p-4 flex flex-col justify-between overflow-hidden"
                  style={{ background: `linear-gradient(${t.dir}, ${t.from}, ${t.to})` }}
                >
                  {/* 배경 장식 */}
                  <div
                    className="absolute -right-5 -bottom-5 w-20 h-20 rounded-full opacity-25"
                    style={{ backgroundColor: t.swatches[0] }}
                  />
                  <div
                    className="absolute right-4 top-4 w-10 h-10 rounded-full opacity-15"
                    style={{ backgroundColor: t.swatches[3] }}
                  />

                  {/* 상단: 이모지 + 체크 */}
                  <div className="flex items-start justify-between relative z-10">
                    <span className="text-[2.8rem] leading-none drop-shadow">{t.emoji}</span>
                    {isActive && (
                      <div className="w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center shrink-0">
                        <span className="text-xs font-black" style={{ color: t.accent }}>✓</span>
                      </div>
                    )}
                  </div>

                  {/* 하단: 태그들 */}
                  <div className="flex flex-wrap gap-1 relative z-10">
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: "rgba(255,255,255,0.40)", color: "#1e293b", backdropFilter: "blur(4px)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 정보 영역 */}
                <div className="bg-white px-4 py-2.5">
                  <p className="font-black text-slate-800 text-base leading-tight">{t.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t.labelEn} · {t.desc}</p>
                </div>

                {/* 컬러 바 */}
                <div className="flex h-1.5">
                  {t.swatches.map((c) => (
                    <div key={c} className="flex-1" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* 설명 */}
        <div
          className="rounded-2xl px-5 py-4 text-sm leading-relaxed"
          style={{ backgroundColor: "var(--theme-accent-soft)", color: "var(--theme-accent-text)" }}
        >
          <p className="font-bold mb-1">테마란?</p>
          <p className="opacity-80 text-[12px]">
            선택한 계절 테마에 따라 앱의 배경색, 카드 색상, 강조색이 바뀌고
            화면에 계절 파티클이 내려와요. 언제든 자유롭게 바꿀 수 있어요 🎨
          </p>
        </div>
      </div>
    </main>
  );
}
