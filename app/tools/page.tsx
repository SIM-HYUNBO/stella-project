"use client";

import { useRouter } from "next/navigation";

export default function TopButtons() {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      
      {/* 🔝 상단 헤더 */}
      <div className="flex items-center h-12 px-3 border-b">
        {/* ← 뒤로가기 */}
        <button
          onClick={() => router.back()}
          className="text-xl mr-2"
        >
          ←
        </button>

        {/* 타이틀 */}
        <div className="text-base font-semibold">
          설정
        </div>
      </div>

      {/* 📋 메뉴 리스트 */}
      <div className="flex flex-col">

        {/* 🔔 알림 */}
        <button
          onClick={() => router.push("/no")}
          className="flex justify-between items-center px-4 py-4 border-b"
        >
          <span>알림</span>
          <span className="text-gray-400">›</span>
        </button>
         <button
          onClick={() => router.push("/fri")}
          className="flex justify-between items-center px-4 py-4 border-b"
        >
          <span>친구</span>
          <span className="text-gray-400">›</span>
        </button>
         <button
          onClick={() => router.push("/font")}
          className="flex justify-between items-center px-4 py-4 border-b"
        >
          <span>글씨체</span>
          <span className="text-gray-400">›</span>
        </button>
          <button
          onClick={() => router.push("/themes")}
          className="flex justify-between items-center px-4 py-4 border-b"
        >
          <span>테마</span>
          <span className="text-gray-400">›</span>
        </button>
 <div className="text-center mt-5 text-gray-500">
 더 많은 기능을 기대해 주세요~
 </div>
      </div>
    </div>
  );
}