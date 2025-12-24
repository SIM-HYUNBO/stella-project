"use client";

import { useState, useEffect } from "react";

type AvatarColors = {
  skin: string;
  eyes: string;
  mouth: string;
  shirt: string;
  pants: string;
};

const defaultColors: AvatarColors = {
  skin: "#FFD1A4",
  eyes: "#000000",
  mouth: "#FF0000",
  shirt: "#3498db",
  pants: "#2c3e50",
};

export default function PixelAvatar() {
  const [colors, setColors] = useState<AvatarColors>(defaultColors);

  // localStorage에서 저장된 색상 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("pixelAvatarColors");
    if (saved) setColors(JSON.parse(saved));
  }, []);

  const handleChange = (key: keyof AvatarColors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem("pixelAvatarColors", JSON.stringify(colors));
    alert("아바타가 저장되었습니다!");
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6">
      {/* 색상 선택 패널 */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">아바타 색상 선택</h2>
        {Object.keys(colors).map((key) => (
          <div key={key} className="flex items-center gap-2">
            <label className="capitalize w-20">{key}</label>
            <input
              type="color"
              value={(colors as any)[key]}
              onChange={(e) => handleChange(key as keyof AvatarColors, e.target.value)}
            />
            <span>{(colors as any)[key]}</span>
          </div>
        ))}
        <button
          onClick={handleSave}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          저장
        </button>
      </div>

      {/* 아바타 미리보기 */}
      <div className="relative w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded p-4 flex justify-center items-center">
        <svg width="128" height="128" viewBox="0 0 32 32">
          {/* 피부 */}
          <rect x="12" y="4" width="8" height="8" fill={colors.skin} />
          {/* 눈 */}
          <rect x="13" y="6" width="2" height="2" fill={colors.eyes} />
          <rect x="17" y="6" width="2" height="2" fill={colors.eyes} />
          {/* 입 */}
          <rect x="14" y="10" width="4" height="1" fill={colors.mouth} />
          {/* 상의 */}
          <rect x="10" y="12" width="12" height="8" fill={colors.shirt} />
          {/* 하의 */}
          <rect x="10" y="20" width="12" height="8" fill={colors.pants} />
        </svg>
      </div>
    </div>
  );
}
