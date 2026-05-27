"use client";

import { useRouter } from "next/navigation";

export default function ContactPage() {
  const router = useRouter();
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const isWeekday = day >= 1 && day <= 5;
  const isOpen = isWeekday && hour >= 9 && hour < 19;

  return (
    <main className="relative min-h-screen overflow-hidden">

      {/* 배경 */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#fff6ee] via-[#fff0e0] to-[#fff8f0]" />
      <div className="fixed top-[-140px] right-[-140px] w-[420px] h-[420px] rounded-full bg-orange-300/20 blur-[100px] animate-[floatA_10s_ease-in-out_infinite_alternate]" />
      <div className="fixed bottom-[-160px] left-[-120px] w-[380px] h-[380px] rounded-full bg-yellow-300/20 blur-[100px] animate-[floatB_13s_ease-in-out_infinite_alternate]" />
      <div className="fixed top-[40%] left-[15%] w-[260px] h-[260px] rounded-full bg-violet-200/15 blur-[80px] animate-[floatC_9s_ease-in-out_infinite_alternate]" />

      <div className="relative z-10">

        {/* 헤더 */}
        <div className="flex items-center h-14 px-4 border-b border-orange-100 bg-white/60 backdrop-blur-md">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-400 font-bold text-lg mr-3">
            ←
          </button>
          <span className="font-black text-[#3d1f00] text-base">고객센터</span>
        </div>

        <div className="px-5 pt-8 pb-16 space-y-6">

          {/* 히어로 */}
          <div className="relative rounded-[32px] overflow-hidden shadow-[0_20px_60px_rgba(255,160,50,0.4)]">
            <div className="bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 px-6 py-8 relative">
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />
              <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.12)_50%,transparent_60%)] animate-[shimmer_4s_infinite]" />
              <div className="relative text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-white/25 backdrop-blur-sm shadow-inner text-5xl mb-4">
                  🎧
                </div>
                <h1 className="text-white font-black text-3xl">WAGIE 고객센터</h1>
                <p className="text-white/75 text-sm mt-2 font-medium">무엇이든 도와드릴게요</p>

                {/* 운영 상태 뱃지 */}
                <div className={`mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full backdrop-blur-sm font-black text-sm shadow-md
                  ${isOpen ? "bg-green-400/30 text-white" : "bg-black/20 text-white/80"}`}>
                  <span className={`w-2 h-2 rounded-full ${isOpen ? "bg-green-300 animate-pulse" : "bg-white/50"}`} />
                  {isOpen ? "지금 운영 중이에요" : "현재 운영 시간이 아니에요"}
                </div>
              </div>
            </div>
          </div>

          {/* 운영시간 카드 */}
          <div className="rounded-[24px] bg-white/80 backdrop-blur-sm border border-orange-100 shadow-[0_4px_20px_rgba(255,150,80,0.1)] overflow-hidden">
            <div className="px-5 py-4 border-b border-orange-50 flex items-center gap-2">
              <span className="text-xl">🕘</span>
              <p className="font-black text-[#3d1f00] text-base">운영 시간</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-[#3d1f00] font-semibold text-sm">평일 (월 – 금)</span>
                </div>
                <span className="text-[#e07020] font-black text-sm">오전 9:00 – 오후 7:00</span>
              </div>
              <div className="h-px bg-orange-50" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-300" />
                  <span className="text-[#3d1f00] font-semibold text-sm">주말 (토·일)</span>
                </div>
                <span className="text-[#c09070] font-semibold text-sm">휴무</span>
              </div>
              <div className="h-px bg-orange-50" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-300" />
                  <span className="text-[#3d1f00] font-semibold text-sm">공휴일</span>
                </div>
                <span className="text-[#c09070] font-semibold text-sm">휴무</span>
              </div>
              <div className="mt-2 rounded-xl bg-orange-50 px-4 py-3 flex items-start gap-2">
                <span className="text-base mt-0.5">💡</span>
                <p className="text-[#c07030] text-xs leading-relaxed font-medium">
                  운영 시간 외에 남겨주신 문의는<br />
                  다음 영업일 순서대로 답변드려요.
                </p>
              </div>
            </div>
          </div>

          {/* 연락처 카드 */}
          <div className="space-y-3">
            <p className="font-black text-[#3d1f00] text-base px-1">연락하기 📬</p>

            {/* 이메일 */}
            <div className="rounded-[24px] bg-white/80 backdrop-blur-sm border border-orange-100 shadow-[0_4px_20px_rgba(255,150,80,0.1)] px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-300 flex items-center justify-center text-2xl shadow-md shrink-0">
                📧
              </div>
              <div className="flex-1">
                <p className="text-[#9d7060] text-xs font-semibold mb-0.5">이메일 문의</p>
                <p className="text-[#3d1f00] font-black text-base">skwst0730@gmail.com</p>
              </div>
            </div>

            {/* 전화 */}
            <div className="rounded-[24px] bg-white/80 backdrop-blur-sm border border-orange-100 shadow-[0_4px_20px_rgba(255,150,80,0.1)] px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center text-2xl shadow-md shrink-0">
                📞
              </div>
              <div className="flex-1">
                <p className="text-[#9d7060] text-xs font-semibold mb-0.5">전화 문의</p>
                <p className="text-[#3d1f00] font-black text-base">010-9117-7823</p>
              </div>
            </div>
          </div>

          {/* 안내 문구 */}
          <div className="rounded-[24px] bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 px-5 py-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">💜</span>
              <p className="font-black text-[#5d3f8f] text-sm">문의 전 참고해주세요</p>
            </div>
            <ul className="space-y-2">
              {[
                "욕설·비방이 포함된 문의는 답변이 어려워요.",
                "동일 문의 반복 시 답변이 지연될 수 있어요.",
                "개인정보 관련 문의는 이메일로 보내주세요.",
              ].map((txt) => (
                <li key={txt} className="flex items-start gap-2 text-xs text-[#7050a0] leading-relaxed">
                  <span className="mt-0.5 text-violet-400 shrink-0">•</span>
                  {txt}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-center text-sm text-[#d4a57a] font-medium py-2">✦ 항상 최선을 다해 도와드릴게요 ✦</p>

        </div>
      </div>

      <style>{`
        @keyframes floatA { 0%{transform:translate(0,0)} 100%{transform:translate(-30px,40px)} }
        @keyframes floatB { 0%{transform:translate(0,0)} 100%{transform:translate(40px,-30px)} }
        @keyframes floatC { 0%{transform:translate(0,0)} 100%{transform:translate(-20px,25px)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </main>
  );
}
