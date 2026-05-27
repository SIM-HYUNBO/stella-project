"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

export default function RootPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/home");
      else setReady(true);
    });
    return () => unsub();
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff7ef]">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-[6px] border-orange-200" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border-[6px] border-transparent border-t-orange-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <main className="relative overflow-hidden">

      {/* ── 배경 ── */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#fff6ee] via-[#fff0e0] to-[#fff8f0]" />
      <div className="fixed top-[-160px] right-[-160px] w-[500px] h-[500px] rounded-full bg-orange-300/20 blur-[100px] animate-[floatA_10s_ease-in-out_infinite_alternate]" />
      <div className="fixed bottom-[-200px] left-[-160px] w-[480px] h-[480px] rounded-full bg-yellow-300/20 blur-[100px] animate-[floatB_13s_ease-in-out_infinite_alternate]" />
      <div className="fixed top-[35%] left-[20%] w-[300px] h-[300px] rounded-full bg-pink-200/15 blur-[80px] animate-[floatC_8s_ease-in-out_infinite_alternate]" />

      <div className="relative z-10 px-5 pt-14 pb-12 space-y-10">

        {/* ── 브랜드 헤더 ── */}
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="absolute w-28 h-28 rounded-full bg-orange-300/30 blur-2xl" />
            <div className="relative w-22 h-22 flex items-center justify-center w-[88px] h-[88px] rounded-[30px] bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 shadow-[0_16px_48px_rgba(255,160,50,0.5)]">
              <span className="text-5xl">💬</span>
            </div>
          </div>
          <h1 className="text-[60px] font-black tracking-[0.22em] text-transparent bg-clip-text bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-400 leading-none">
            WAGIE
          </h1>
          <p className="mt-3 text-[#b07848] font-semibold text-base">따뜻한 대화가 시작되는 곳 🧡</p>

          {/* NEW 뱃지 */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-400 to-amber-300 shadow-md">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-black tracking-wider">지금 바로 시작하세요</span>
          </div>
        </div>

        {/* ── 스탯 바 ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "👥", value: "1,200+", label: "활성 유저" },
            { icon: "💬", value: "50만+", label: "오간 메시지" },
            { icon: "🤝", value: "3,000+", label: "친구 연결" },
          ].map(({ icon, value, label }) => (
            <div key={label} className="rounded-[20px] bg-white/70 backdrop-blur-sm border border-orange-100 px-3 py-4 text-center shadow-sm">
              <p className="text-2xl mb-1">{icon}</p>
              <p className="text-[#e07020] font-black text-lg leading-none">{value}</p>
              <p className="text-[#c09070] text-[10px] font-semibold mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ── 채팅 미리보기 ── */}
        <div className="rounded-[28px] bg-white/60 backdrop-blur-sm border border-orange-100 shadow-[0_8px_32px_rgba(255,150,80,0.12)] px-4 py-5 space-y-3">
          <p className="text-xs font-black text-[#d4904a] tracking-widest mb-4">LIVE PREVIEW ✦</p>

          <div className="flex items-end gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-300 to-amber-300 flex items-center justify-center text-lg shrink-0 shadow">🐣</div>
            <div className="max-w-[75%] rounded-[18px] rounded-bl-md bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm border border-orange-50">
              오늘 진짜 힘들었다 😭
            </div>
          </div>

          <div className="flex justify-end items-end gap-2">
            <div className="max-w-[75%] rounded-[18px] rounded-br-md bg-gradient-to-r from-orange-400 to-amber-300 px-4 py-3 text-sm text-white shadow-md">
              고생했어... 내가 안아줄게 ☁️
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-rose-300 flex items-center justify-center text-lg shrink-0 shadow">🌸</div>
          </div>

          <div className="flex items-end gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-300 to-amber-300 flex items-center justify-center text-lg shrink-0 shadow">🐣</div>
            <div className="max-w-[75%] rounded-[18px] rounded-bl-md bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm border border-orange-50">
              여기 오니까 마음 편하다 🧡
            </div>
          </div>

          <div className="flex justify-end items-end gap-2">
            <div className="max-w-[75%] rounded-[18px] rounded-br-md bg-gradient-to-r from-orange-400 to-amber-300 px-4 py-3 text-sm text-white shadow-md">
              나도! 매일 여기서 얘기하자 ✨
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-rose-300 flex items-center justify-center text-lg shrink-0 shadow">🌸</div>
          </div>
        </div>

        {/* ── 기능 카드 ── */}
        <div>
          <p className="font-black text-[#3d1f00] text-base mb-3 px-1">이런 게 있어요 ✨</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[24px] bg-gradient-to-br from-red-400 via-orange-400 to-amber-300 px-5 py-5 shadow-[0_8px_28px_rgba(255,100,50,0.3)]">
              <div className="w-11 h-11 rounded-xl bg-white/25 flex items-center justify-center text-2xl mb-3">💬</div>
              <p className="text-white font-black text-base">1:1 채팅</p>
              <p className="text-white/70 text-xs mt-1">친구와 나만의<br />소중한 대화</p>
            </div>

            <div className="rounded-[24px] bg-gradient-to-br from-yellow-400 to-orange-400 px-5 py-5 shadow-[0_8px_28px_rgba(255,180,30,0.3)]">
              <div className="w-11 h-11 rounded-xl bg-white/25 flex items-center justify-center text-2xl mb-3">👥</div>
              <p className="text-white font-black text-base">단체채팅</p>
              <p className="text-white/70 text-xs mt-1">친구들 모두<br />같이 얘기해요</p>
            </div>

            <div className="rounded-[24px] bg-gradient-to-br from-pink-400 to-rose-500 px-5 py-5 shadow-[0_8px_28px_rgba(255,100,160,0.28)]">
              <div className="w-11 h-11 rounded-xl bg-white/25 flex items-center justify-center text-2xl mb-3">📔</div>
              <p className="text-white font-black text-base">다이어리</p>
              <p className="text-white/70 text-xs mt-1">오늘 하루를<br />글로 남겨봐요</p>
            </div>

            <div className="rounded-[24px] bg-gradient-to-br from-violet-400 to-purple-500 px-5 py-5 shadow-[0_8px_28px_rgba(150,80,255,0.28)]">
              <div className="w-11 h-11 rounded-xl bg-white/25 flex items-center justify-center text-2xl mb-3">🤝</div>
              <p className="text-white font-black text-base">친구 맺기</p>
              <p className="text-white/70 text-xs mt-1">새로운 인연을<br />만들어봐요</p>
            </div>
          </div>
        </div>

        {/* ── 분위기 하이라이트 ── */}
        <div className="rounded-[28px] overflow-hidden shadow-[0_20px_60px_rgba(255,160,50,0.35)]">
          <div className="bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 px-6 py-7 relative">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <p className="text-white/80 text-xs font-black tracking-widest mb-2">WHY WAGIE?</p>
              <p className="text-white font-black text-2xl leading-snug">어떤 날도<br />혼자가 아니에요 🌙</p>
              <p className="text-white/75 text-sm mt-3 leading-relaxed">기쁜 날도, 힘든 날도<br />늘 곁에 있는 친구들과 함께해요.</p>
              <div className="mt-4 flex gap-2">
                <span className="px-3 py-1.5 rounded-full bg-white/25 text-white text-xs font-bold">따뜻함 🧡</span>
                <span className="px-3 py-1.5 rounded-full bg-white/25 text-white text-xs font-bold">즐거움 ✨</span>
                <span className="px-3 py-1.5 rounded-full bg-white/25 text-white text-xs font-bold">함께 👫</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 알림 기능 소개 ── */}
        <div className="rounded-[24px] bg-white/70 backdrop-blur-sm border border-orange-100 px-5 py-5 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-200 to-amber-200 flex items-center justify-center text-3xl shrink-0 shadow">🔔</div>
          <div>
            <p className="font-black text-[#3d1f00] text-base">실시간 알림</p>
            <p className="text-[#c09070] text-sm mt-0.5">메시지가 오면 바로 알려드려요.<br />앱 아이콘에 숫자로 표시돼요.</p>
          </div>
        </div>

        {/* ── 버튼 ── */}
        <div className="space-y-3">
          <Link
            href="/login"
            className="group relative flex items-center justify-center h-16 rounded-[22px] overflow-hidden shadow-[0_12px_40px_rgba(255,160,50,0.45)] active:scale-[0.98] transition-transform"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400" />
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition" />
            <span className="relative text-white text-xl font-black tracking-wide">로그인</span>
            <span className="absolute right-6 text-2xl">💭</span>
          </Link>

          <Link
            href="/signup"
            className="flex items-center justify-center h-16 rounded-[22px] bg-white/85 backdrop-blur-sm border border-orange-200 shadow-[0_6px_24px_rgba(255,150,80,0.18)] active:scale-[0.98] transition-transform relative"
          >
            <span className="text-[#c07030] text-xl font-black tracking-wide">회원가입</span>
            <span className="absolute right-6 text-xl">✨</span>
          </Link>
        </div>

        <p className="text-center text-sm text-[#d4a57a] font-medium pb-2">✦ 친구들과, 마음을 나눠요 ✦</p>

      </div>

      <style>{`
        @keyframes floatA { 0%{transform:translate(0,0)} 100%{transform:translate(-30px,40px)} }
        @keyframes floatB { 0%{transform:translate(0,0)} 100%{transform:translate(40px,-30px)} }
        @keyframes floatC { 0%{transform:translate(0,0)} 100%{transform:translate(-20px,25px)} }
      `}</style>
    </main>
  );
}
