"use client";

import { useRouter } from "next/navigation";

export default function AppInfoPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gray-50" />

      <div className="relative z-10">
        {/* 헤더 */}
        <div className="flex items-center h-14 px-4 bg-white border-b border-gray-100">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-400 font-bold text-lg mr-3">←</button>
          <span className="font-black text-[#3d1f00] text-base">앱 정보</span>
        </div>

        <div className="px-5 pt-8 pb-16 space-y-5">

          {/* 히어로 */}
          <div className="rounded-[28px] bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 px-6 py-7 shadow-[0_16px_50px_rgba(255,160,50,0.4)] relative overflow-hidden text-center">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.12)_50%,transparent_60%)] animate-[shimmer_4s_infinite]" />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-white/25 text-4xl shadow-inner mb-4">💬</div>
              <h1 className="text-white font-black text-3xl tracking-widest">WAGIE</h1>
              <p className="text-white/75 text-sm mt-1">따뜻한 대화가 시작되는 곳</p>
            </div>
          </div>

          {/* 정보 카드 */}
          <div className="rounded-[24px] bg-white border border-gray-100 shadow-[0_4px_20px_rgba(255,150,80,0.1)] overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-200 to-amber-200 flex items-center justify-center text-xl">📦</div>
                <span className="font-semibold text-[#3d1f00] text-sm">버전</span>
              </div>
              <span className="text-[#c09070] text-sm font-bold bg-orange-50 px-3 py-1 rounded-full">v0.1.0</span>
            </div>

            <button onClick={() => router.push("/tools/contact")}
              className="w-full px-5 py-4 flex items-center justify-between active:bg-orange-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-200 to-purple-200 flex items-center justify-center text-xl">🎧</div>
                <span className="font-semibold text-[#3d1f00] text-sm">Q&A방</span>
              </div>
              <span className="text-orange-300 text-xl">›</span>
            </button>
          </div>

          {/* 태그라인 */}
          <p className="text-center text-sm text-[#d4a57a] font-medium pt-4">✦ Made with 🧡 by WAGIE Team ✦</p>

        </div>
      </div>

      <style>{`
        @keyframes floatA { 0%{transform:translate(0,0)} 100%{transform:translate(-30px,40px)} }
        @keyframes floatB { 0%{transform:translate(0,0)} 100%{transform:translate(40px,-30px)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </main>
  );
}
