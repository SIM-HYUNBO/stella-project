"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AISettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setEnabled(localStorage.getItem("ai_summary") === "true");
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem("ai_summary", String(next));
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gray-50" />
      <div className="relative z-10">
        <div className="flex items-center h-14 px-4 bg-white border-b border-gray-100 sticky top-0 z-20">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-yellow-50 text-sky-400 font-bold text-lg mr-3">←</button>
          <span className="font-black text-slate-800 text-base">🧠 AI 요약</span>
        </div>
        <div className="px-5 pt-6 pb-16 space-y-4">

          {/* 설명 카드 */}
          <div className="rounded-[24px] bg-white border border-gray-100 px-5 py-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-300 to-purple-400 flex items-center justify-center text-2xl shadow-md">🧠</div>
              <p className="font-black text-slate-800 text-base">AI 요약 기능</p>
            </div>
            <p className="text-[#9d7060] text-sm leading-relaxed">
              채팅을 자동으로 요약해주는 기능이에요.<br />
              요약된 내용은 채팅방 상단에 표시되고,<br />
              요약 버튼은 전송 버튼 옆에 위치해요.
            </p>
          </div>

          {/* 토글 */}
          <div className="rounded-[24px] bg-white border border-gray-100 px-5 py-4 flex items-center justify-between shadow-sm">
            <div>
              <p className="font-black text-slate-800 text-base">AI 요약 사용</p>
              <p className={`text-xs font-semibold mt-0.5 ${enabled ? "text-green-500" : "text-sky-400"}`}>
                {enabled ? "ON · 활성화됨" : "OFF · 비활성화됨"}
              </p>
            </div>
            <button onClick={toggle}
              className={`w-14 h-7 rounded-full transition-all duration-300 flex items-center px-0.5 ${enabled ? "bg-gradient-to-r from-sky-400 to-cyan-300 shadow-md" : "bg-gray-200"}`}>
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${enabled ? "translate-x-7" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
