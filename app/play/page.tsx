"use client";

import { useRouter } from 'next/navigation'; // Next.js 13+ 버전 기준

export default function PlaymobilPage() {
  const router = useRouter();

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {/* 뒤로가기 버튼 */}
      <button
        onClick={() => router.back()}
        className="fixed top-5 right-5 z-[100] bg-white w-11 h-11 rounded-2xl border border-gray-300 shadow-lg flex items-center justify-center text-2xl font-bold active:scale-95 transition-all text-black"
      >
        →
      </button>

      {/* 게임 화면 (iframe) */}
      <iframe
        src="/playmobil_v5.html"
        title="Playmobil Character"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
      />
    </div>
  );
}