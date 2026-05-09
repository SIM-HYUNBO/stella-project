"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const THEMES = [
  {
    label: "☀️ 라이트",
    value: "light",
    bg: "#ffffff",
    card: "rgba(255,255,255,0.85)",
    border: "rgba(0,0,0,0.1)",
  },
  {
    label: "🌿 민트 글래스",
    value: "mint",
    bg: "linear-gradient(135deg, #d4fff3, #eafff8)",
    card: "rgba(255,255,255,0.35)",
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
    label: "☁️ 스카이 블루",
    value: "sky",
    bg: "linear-gradient(135deg, #dbeeff, #f5fbff)",
    card: "rgba(255,255,255,0.35)",
    border: "rgba(120, 180, 255, 0.4)",
  },
];

export default function ThemePage() {
  const router = useRouter();
  const [active, setActive] = useState("light");

  // 💾 초기 로드 (저장값 복구)
  useEffect(() => {
    const saved = localStorage.getItem("theme");

    if (saved) {
      const theme = THEMES.find((t) => t.value === saved);
      if (theme) applyTheme(theme);
    } else {
      applyTheme(THEMES[0]);
    }
  }, []);

  const applyTheme = (t) => {
    setActive(t.value);

    // 🎨 배경 적용
    document.body.style.background = t.bg;

    // 🧊 glass 스타일 변수
    document.documentElement.style.setProperty("--theme-card", t.card);
    document.documentElement.style.setProperty("--theme-border", t.border);

    // 💾 저장
    localStorage.setItem("theme", t.value);
  };

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: 30,
        fontFamily: "inherit",
      }}
    >
      {/* 🔙 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          ← 뒤로가기
        </button>

        <h2 style={{ margin: 0 }}>🎨 테마 설정</h2>
      </div>

      {/* 🌈 테마 리스트 */}
      <div
        style={{
          marginTop: 20,
          display: "grid",
          gap: 12,
        }}
      >
        {THEMES.map((t) => (
          <div
            key={t.value}
            onClick={() => applyTheme(t)}
            style={{
              padding: 16,
              borderRadius: 16,
              cursor: "pointer",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              background:
                active === t.value ? t.card : "rgba(255,255,255,0.25)",
              border:
                active === t.value
                  ? `2px solid ${t.border}`
                  : "1px solid rgba(0,0,0,0.1)",
              transition: "0.25s ease",
              boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontWeight: 600 }}>{t.label}</div>
          </div>
        ))}
      </div>

      {/* 👀 미리보기 */}
      <div
        style={{
          marginTop: 30,
          padding: 16,
          borderRadius: 16,
          backdropFilter: "blur(12px)",
          background: "var(--theme-card)",
          border: "1px solid var(--theme-border)",
        }}
      >
        👀 미리보기 영역  
        선택한 테마가 즉시 반영됩니다
      </div>
    </div>
  );
}