"use client";

import { useRouter } from "next/navigation";

export default function AppInfoPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <div className="flex items-center h-12 px-3 border-b">
        <button onClick={() => router.back()} className="text-xl mr-2">←</button>
        <div className="text-base font-semibold">앱 정보</div>
      </div>

      <div className="flex flex-col">
        {/* 버전 */}
        <div className="flex justify-between items-center px-4 py-4 border-b">
          <span>버전</span>
          <span className="text-gray-400 text-sm">v0.1.0</span>
        </div>

        {/* 고객센터 */}
        <button
          onClick={() => window.location.href = "mailto:hbsim0605@gmail.com"}
          className="flex justify-between items-center px-4 py-4 border-b"
        >
          <span>고객센터</span>
          <span className="text-gray-400">›</span>
        </button>
      </div>
    </div>
  );
}
