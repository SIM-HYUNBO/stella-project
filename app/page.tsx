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
    <main className="relative min-h-screen overflow-hidden">

      {/* ── 배경 ── */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#fff6ee] via-[#fff0e0] to-[#fff8f0]" />
      <div className="fixed top-[-160px] right-[-160px] w-[500px] h-[500px] rounded-full bg-orange-300/20 blur-[100px] animate-[floatA_10s_ease-in-out_infinite_alternate]" />
      <div className="fixed bottom-[-200px] left-[-160px] w-[480px] h-[480px] rounded-full bg-yellow-300/20 blur-[100px] animate-[floatB_13s_ease-in-out_infinite_alternate]" />
      <div className="fixed top-[35%] left-[20%] w-[300px] h-[300px] rounded-full bg-pink-200/15 blur-[80px] animate-[floatC_8s_ease-in-out_infinite_alternate]" />

      <div className="relative z-10 min-h-screen flex flex-col px-5 pt-16 pb-10">

        {/* ── 브랜드 헤더 ── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-gradient-to-br from-orange-400 to-amber-300 shadow-[0_16px_40px_rgba(255,160,50,0.45)] mb-5">
            <span className="text-4xl">💬</span>
          </div>
          <h1 className="text-[56px] font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-400 leading-none">
            WAGIE
          </h1>
          <p className="mt-3 text-[#b07848] font-semibold text-base">따뜻한 대화가 시작되는 곳 🧡</p>
        </div>

        {/* ── 채팅 미리보기 ── */}
        <div className="space-y-3 mb-10 px-1">
          <div className="flex items-end gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-300 to-amber-300 flex items-center justify-center text-lg shrink-0 shadow-md">🐣</div>
            <div className="max-w-[72%] rounded-[20px] rounded-bl-md bg-white/90 backdrop-blur-sm px-5 py-3.5 text-sm text-zinc-700 shadow-[0_4px_20px_rgba(255,150,80,0.15)] border border-orange-50">
              오늘 진짜 힘들었다 😭
            </div>
          </div>

          <div className="flex justify-end items-end gap-2">
            <div className="max-w-[72%] rounded-[20px] rounded-br-md bg-gradient-to-r from-orange-400 to-amber-300 px-5 py-3.5 text-sm text-white shadow-[0_4px_20px_rgba(255,160,50,0.35)]">
              고생했어... 내가 안아줄게 ☁️
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-rose-300 flex items-center justify-center text-lg shrink-0 shadow-md">🌸</div>
          </div>

          <div className="flex items-end gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-300 to-amber-300 flex items-center justify-center text-lg shrink-0 shadow-md">🐣</div>
            <div className="max-w-[72%] rounded-[20px] rounded-bl-md bg-white/90 backdrop-blur-sm px-5 py-3.5 text-sm text-zinc-700 shadow-[0_4px_20px_rgba(255,150,80,0.15)] border border-orange-50">
              여기 오니까 마음 편하다 🧡
            </div>
          </div>

          <div className="flex justify-end items-end gap-2">
            <div className="max-w-[72%] rounded-[20px] rounded-br-md bg-gradient-to-r from-orange-400 to-amber-300 px-5 py-3.5 text-sm text-white shadow-[0_4px_20px_rgba(255,160,50,0.35)]">
              나도! 매일 여기서 얘기하자 ✨
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-rose-300 flex items-center justify-center text-lg shrink-0 shadow-md">🌸</div>
          </div>
        </div>

        {/* ── 기능 태그 ── */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {[["💬", "1:1 채팅"], ["👥", "단체채팅"], ["📔", "다이어리"], ["🤝", "친구 맺기"]].map(([icon, label]) => (
            <span key={label} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-orange-100 text-sm font-semibold text-[#c07040] shadow-sm">
              <span>{icon}</span>{label}
            </span>
          ))}
        </div>

        {/* ── 버튼 ── */}
        <div className="space-y-3 mt-auto">
          <Link
            href="/login"
            className="group relative flex items-center justify-center h-16 rounded-[22px] overflow-hidden shadow-[0_12px_40px_rgba(255,160,50,0.4)] active:scale-[0.98] transition-transform"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400" />
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition" />
            <span className="relative text-white text-xl font-black tracking-wide">로그인</span>
            <span className="absolute right-6 text-2xl">💭</span>
          </Link>

          <Link
            href="/signup"
            className="flex items-center justify-center h-16 rounded-[22px] bg-white/85 backdrop-blur-sm border border-orange-100 shadow-[0_6px_24px_rgba(255,150,80,0.15)] active:scale-[0.98] transition-transform relative"
          >
            <span className="text-[#c07030] text-xl font-black tracking-wide">회원가입</span>
            <span className="absolute right-6 text-xl">✨</span>
          </Link>
        </div>

        <p className="text-center text-sm text-[#d4a57a] font-medium mt-6">✦ 친구들과, 마음을 나눠요 ✦</p>
      </div>

      <style>{`
        @keyframes floatA { 0%{transform:translate(0,0)} 100%{transform:translate(-30px,40px)} }
        @keyframes floatB { 0%{transform:translate(0,0)} 100%{transform:translate(40px,-30px)} }
        @keyframes floatC { 0%{transform:translate(0,0)} 100%{transform:translate(-20px,25px)} }
      `}</style>
    </main>
  );
}
