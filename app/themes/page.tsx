"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const THEMES = [
   {
    label: "라이트",
    value: "light",
    bg: "linear-gradient(135deg, #ffffff, #ffffff)",
    card: "rgb(255, 255, 255)",
    border: "rgba(255, 255, 255, 0)",
  },
  {
    label: "🌿 민트 글래스",
    value: "mint",
    bg: "linear-gradient(135deg, #d4fff3, #eafff8)",
    card: "rgba(255,255,255,0.4)",
    border: "rgba(120, 255, 200, 0.4)",
  },
  {
    label: "🍑 피치 소프트",
    value: "peach",
    bg: "linear-gradient(135deg, #ffe0d2, #fff3ec)",
    card: "rgba(255,255,255,0.35)",
    border: "rgba(255, 170, 140, 0.4)",
  },
  {
    label: "🌸 라벤더",
    value: "lavender",
    bg: "linear-gradient(135deg, #eee6ff, #f8f5ff)",
    card: "rgba(255,255,255,0.35)",
    border: "rgba(180, 150, 255, 0.4)",
  },
  {
    label: "☁️ 스카이",
    value: "sky",
    bg: "linear-gradient(135deg, #dbeeff, #f5fbff)",
    card: "rgba(255,255,255,0.35)",
    border: "rgba(120, 180, 255, 0.4)",
  },
];

export default function ThemePage() {
  const router = useRouter();
  const [active, setActive] = useState("mint");

  const applyTheme = (t) => {
    setActive(t.value);

    document.body.style.background = t.bg;
    document.documentElement.style.setProperty("--theme-card", t.card);
    document.documentElement.style.setProperty("--theme-border", t.border);
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 30 }}>
      
      {/* 뒤로가기 */}
      <button onClick={() => router.back()}>
        ← 뒤로가기
      </button>

      <h2>🎨 감성 테마</h2>

      {/* 테마 카드 */}
      <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
        {THEMES.map((t) => (
          <div
            key={t.value}
            onClick={() => applyTheme(t)}
            style={{
              padding: 16,
              borderRadius: 16,
              cursor: "pointer",
              backdropFilter: "blur(12px)",
              background:
                active === t.value ? t.card : "rgba(255,255,255,0.2)",
              border:
                active === t.value
                  ? `2px solid ${t.border}`
                  : "1px solid rgba(0,0,0,0.1)",
              transition: "0.25s",
            }}
          >
            {t.label}
          </div>
        ))}
      </div>
    </div>
  );
}