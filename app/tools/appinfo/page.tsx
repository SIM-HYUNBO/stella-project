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
        <a
          href="mailto:hbsim0605@gmail.com"
          className="flex justify-between items-center px-4 py-4 border-b active:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-lg">
              💌
            </div>
            <div>
              <div className="text-sm font-semibold">고객센터</div>
              <div className="text-xs text-gray-400">hbsim0605@gmail.com</div>
            </div>
          </div>
          <span className="text-gray-400">›</span>
        </a>
      </div>
    </div>
  );
}
