"use client";

import { useRouter } from "next/navigation";
import { useFont } from "../FontContext";

const FONT_OPTIONS = [
  { label: "기본 (Geist)", value: "var(--font-geist)" },
  { label: "Noto Sans KR", value: "var(--font-noto)" },
  { label: "JetBrains Mono", value: "var(--font-mono)" },
  { label: "도현", value: "var(--font-dohyeon)" },
  { label: "브러시 감성", value: "var(--font-brush)" },
];

export default function FontSettings() {
  const { font, changeFont } = useFont();
  const router = useRouter();

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 30 }}>
      
      {/* 🔙 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ← 뒤로가기
        </button>

        <h2 style={{ margin: 0 }}>⚙️ 폰트 설정</h2>
      </div>

      {/* 폰트 리스트 */}
      <div style={{ marginTop: 20 }}>
        {FONT_OPTIONS.map((f) => (
          <div
            key={f.value}
            onClick={() => changeFont(f.value)}
            style={{
              padding: 12,
              marginBottom: 10,
              border: "1px solid #ddd",
              borderRadius: 10,
              cursor: "pointer",
              background: font === f.value ? "#eef" : "white",
              transition: "0.2s",
            }}
          >
            {f.label}
          </div>
        ))}
      </div>

      {/* 미리보기 */}
      <div
        style={{
          marginTop: 20,
          padding: 15,
          border: "1px solid #ddd",
          borderRadius: 10,
        }}
      >
        👀 미리보기 텍스트  
        현재 선택된 폰트가 즉시 반영됩니다.
      </div>
    </div>
  );
}