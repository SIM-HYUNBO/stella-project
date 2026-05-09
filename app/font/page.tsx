"use client";

import { useEffect, useState } from "react";

const FONT_LIST = [
  {
    name: "Pretendard",
    value: "'Pretendard', sans-serif",
  },
  {
    name: "SUIT",
    value: "'SUIT', sans-serif",
  },
  {
    name: "Inter",
    value: "'Inter', sans-serif",
  },
  {
    name: "Noto Sans KR",
    value: "'Noto Sans KR', sans-serif",
  },
  {
    name: "Gowun Dodum",
    value: "'Gowun Dodum', sans-serif",
  },
  {
    name: "Nanum Gothic",
    value: "'Nanum Gothic', sans-serif",
  },
  {
    name: "Nanum Myeongjo",
    value: "'Nanum Myeongjo', serif",
  },
  {
    name: "IBM Plex Sans KR",
    value: "'IBM Plex Sans KR', sans-serif",
  },
  {
    name: "ONE Mobile",
    value: "'ONE Mobile', sans-serif",
  },
  {
    name: "Cafe24 Ssurround",
    value: "'Cafe24 Ssurround', sans-serif",
  },
  {
    name: "RIDIBatang",
    value: "'RIDIBatang', serif",
  },
  {
    name: "MaruBuri",
    value: "'MaruBuri', serif",
  },
  {
    name: "Gmarket Sans",
    value: "'Gmarket Sans', sans-serif",
  },
  {
    name: "Gaegu",
    value: "'Gaegu', cursive",
  },
  {
    name: "Black Han Sans",
    value: "'Black Han Sans', sans-serif",
  },
  {
    name: "Do Hyeon",
    value: "'Do Hyeon', sans-serif",
  },
];

export default function FontSettingsPage() {
  const [selectedFont, setSelectedFont] = useState(
    "'Pretendard', sans-serif"
  );

  useEffect(() => {
    const savedFont = localStorage.getItem("wagie-font");

    if (savedFont) {
      setSelectedFont(savedFont);

      document.documentElement.style.setProperty(
        "--app-font",
        savedFont
      );
    }
  }, []);

  const changeFont = (fontValue) => {
    setSelectedFont(fontValue);

    localStorage.setItem("wagie-font", fontValue);

    document.documentElement.style.setProperty(
      "--app-font",
      fontValue
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111",
        color: "white",
        padding: "24px",
        fontFamily: "var(--app-font)",
      }}
    >
      <h1
        style={{
          fontSize: "28px",
          fontWeight: "bold",
          marginBottom: "24px",
        }}
      >
        글씨체 설정
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {FONT_LIST.map((font) => {
          const active = selectedFont === font.value;

          return (
            <button
              key={font.name}
              onClick={() => changeFont(font.value)}
              style={{
                padding: "20px",
                borderRadius: "16px",
                border: active
                  ? "2px solid #ffe066"
                  : "1px solid #333",
                background: active ? "#1f1f1f" : "#181818",
                cursor: "pointer",
                transition: "0.2s",
                textAlign: "left",
                color: "white",
                fontFamily: font.value,
              }}
            >
              <div
                style={{
                  fontSize: "20px",
                  marginBottom: "10px",
                }}
              >
                {font.name}
              </div>

              <div
                style={{
                  opacity: 0.8,
                  lineHeight: 1.6,
                }}
              >
                안녕하세요 WAGIE 입니다.
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}