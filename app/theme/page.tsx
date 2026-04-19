"use client";

import { useEffect } from "react";

function setTheme(t: string) {
  document.body.className = t;
  localStorage.setItem("theme", t);
}

export default function ThemePage() {
  const isVIP = localStorage.getItem("vip") === "true";

  // 새로고침 시 유지
  useEffect(() => {
    const t = localStorage.getItem("theme");
    if (t) document.body.className = t;
  }, []);

  return (
    <div className="min-h-screen">
      
      {/* 🔝 헤더 */}
      <div className="h-12 flex items-center px-4 border-b">
        테마 설정
      </div>

      {/* 📋 리스트 */}
      <div>
        
        {/* 무료 */}
        <button
          onClick={() => setTheme("light")}
          className="w-full text-left px-4 py-4 border-b"
        >
          라이트
        </button>
        <button
          onClick={() => {
            if (!isVIP) return alert("VIP 전용");
            setTheme("sunset");
          }}
          className="w-full text-left px-4 py-4 border-b"
        >
         glow🔒
        </button>
         <button
          onClick={() => {
            if (!isVIP) return alert("VIP 전용");
            setTheme("gold");
          }}
          className="w-full text-left px-4 py-4 border-b"
        >
         sunset🔒
        </button>

      </div>
    </div>
  );
}