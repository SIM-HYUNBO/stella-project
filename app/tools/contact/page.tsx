"use client";

import { useRouter } from "next/navigation";

export default function QnaPage() {
  const router = useRouter();
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const isOpen = day >= 1 && day <= 5 && hour >= 9 && hour < 19;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-[#fff6ee] via-[#fff0e0] to-[#fff8f0]" />
      <div className="relative z-10">

        <div className="flex items-center h-14 px-4 bg-white/60 backdrop-blur-md border-b border-orange-100 sticky top-0 z-20">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-400 font-bold text-lg mr-3">←</button>
          <span className="font-black text-[#3d1f00] text-base">Q&amp;A방</span>
          <span className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isOpen ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            {isOpen ? "운영 중" : "운영 종료"}
          </span>
        </div>

        <div className="px-5 pt-6 pb-16 space-y-4">

          {/* 이메일 카드 */}
          <div className="rounded-[20px] bg-white/80 backdrop-blur-sm border border-orange-100 px-5 py-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-2xl shrink-0">📧</div>
            <div>
              <p className="text-[#9d7060] text-xs font-semibold mb-0.5">이메일 문의</p>
              <p className="font-black text-[#3d1f00] text-base">skwst0730@gmail.com</p>
            </div>
          </div>

          {/* 운영시간 */}
          <div className="rounded-[20px] bg-white/80 backdrop-blur-sm border border-orange-100 px-5 py-4 shadow-sm space-y-3">
            <p className="font-black text-[#3d1f00] text-sm">🕘 운영 시간</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#3d1f00] font-semibold">평일 (월 – 금)</span>
                <span className="text-orange-500 font-black">09:00 – 19:00</span>
              </div>
              <div className="h-px bg-orange-50" />
              <div className="flex justify-between">
                <span className="text-[#3d1f00] font-semibold">주말 · 공휴일</span>
                <span className="text-[#c09070] font-semibold">휴무</span>
              </div>
            </div>
            <p className="text-xs text-[#c09070] leading-relaxed pt-1">
              운영 시간 외 문의는 다음 영업일에 순서대로 답변드려요.
            </p>
          </div>

          {/* 안내 */}
          <div className="rounded-[20px] bg-white/80 backdrop-blur-sm border border-orange-100 px-5 py-4 shadow-sm space-y-2">
            <p className="font-black text-[#3d1f00] text-sm">📋 문의 전 참고해주세요</p>
            {[
              "욕설·비방이 포함된 문의는 답변이 어려워요.",
              "동일 문의 반복 시 답변이 지연될 수 있어요.",
              "개인정보 관련 문의는 이메일로 보내주세요.",
            ].map((txt) => (
              <p key={txt} className="text-xs text-[#9d7060] leading-relaxed flex gap-2">
                <span className="text-orange-300 shrink-0">•</span>{txt}
              </p>
            ))}
          </div>

        </div>
      </div>
    </main>
  );
}
