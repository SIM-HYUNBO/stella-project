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
      <div className="min-h-screen flex items-center justify-center bg-yellow-50">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-[6px] border-sky-300" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border-[6px] border-transparent border-t-yellow-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yellow-50 font-sans overflow-x-hidden">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-50 bg-yellow-50/90 backdrop-blur border-b border-yellow-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center">
              <img src="/wag.png" alt="logo" className="w-5 h-5 object-contain" />
            </div>
            <span className="text-sky-500 font-black text-xl tracking-widest">WAGIE</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-sky-500 transition">기능</a>
            <Link href="/login" className="hover:text-sky-500 transition">로그인</Link>
            <Link href="/signup"
              className="px-5 py-2 rounded-full bg-sky-500 text-white font-bold hover:bg-sky-600 transition shadow shadow-sky-200">
              시작하기
            </Link>
          </nav>

          <Link href="/login" className="md:hidden px-4 py-2 rounded-full bg-sky-500 text-white text-sm font-bold">
            시작하기
          </Link>
        </div>
      </header>

      {/* ── 히어로 ── */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-200 text-yellow-800 text-xs font-bold mb-8">
          ✦ 친구들과 매일 소통해요
        </div>

        <h1 className="text-5xl md:text-[64px] font-black text-slate-900 leading-[1.1] mb-6">
          대화가<br />
          <span className="text-sky-500">즐거워지는</span>{" "}
          <span className="relative inline-block">
            공간
            <span className="absolute -bottom-1 left-0 w-full h-3 bg-yellow-300 -z-10 rounded" />
          </span>
        </h1>

        <p className="text-slate-500 text-base leading-relaxed mb-10 max-w-md mx-auto">
          1:1 채팅부터 단체방, 다이어리, 회의방까지.
          <br />친구들과의 모든 순간을 담아요.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/signup"
            className="px-7 py-3.5 rounded-2xl bg-sky-500 text-white font-black text-sm hover:bg-sky-600 transition shadow-lg shadow-sky-200 active:scale-95">
            무료로 시작하기 →
          </Link>
          <Link href="/login"
            className="px-7 py-3.5 rounded-2xl bg-yellow-300 text-yellow-900 font-black text-sm hover:bg-yellow-400 transition active:scale-95">
            로그인
          </Link>
        </div>
      </section>

      {/* ── 기능 카드 ── */}
      <section id="features" className="bg-white border-t-4 border-yellow-200 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-2 h-8 rounded-full bg-sky-500" />
            <div>
              <p className="text-sky-500 font-bold text-xs tracking-widest">FEATURES</p>
              <h2 className="text-2xl font-black text-slate-900">이런 기능이 있어요</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { icon: "💬", accent: "border-sky-300  bg-sky-50",  iconBg: "bg-sky-100",    title: "1:1 채팅",  desc: "친구와 나만의 실시간 대화" },
              { icon: "👥", accent: "border-yellow-300 bg-yellow-50", iconBg: "bg-yellow-100", title: "단체채팅",  desc: "여럿이 함께하는 그룹 채팅" },
              { icon: "📔", accent: "border-sky-200  bg-sky-50",  iconBg: "bg-sky-50",     title: "다이어리",  desc: "오늘 하루를 글로 기록해요" },
              { icon: "📋", accent: "border-yellow-200 bg-yellow-50", iconBg: "bg-yellow-50",  title: "회의방",    desc: "주제 고정 · 긴급회의 알림" },
              { icon: "🤖", accent: "border-sky-400  bg-sky-50",  iconBg: "bg-sky-100",    title: "AI 어시스턴트", desc: "나만의 개인 AI와 대화해요" },
            ].map(({ icon, accent, iconBg, title, desc }) => (
              <div key={title} className={`border-2 ${accent} rounded-[20px] p-6 hover:shadow-md transition-all`}>
                <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center text-2xl mb-4`}>{icon}</div>
                <p className="font-black text-slate-800 text-sm mb-1.5">{title}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA 배너 ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="rounded-[32px] bg-sky-500 px-8 py-12 md:px-16 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-yellow-300/20 translate-y-1/2 -translate-x-1/2" />
          <div className="relative text-center md:text-left">
            <p className="text-yellow-300 font-bold text-sm mb-2">지금 바로 시작해요</p>
            <h3 className="text-white font-black text-3xl mb-2">대화를 시작할 준비 됐나요?</h3>
            <p className="text-white/70 text-sm">친구들이 기다리고 있어요 👋</p>
          </div>
          <div className="relative flex gap-3 shrink-0">
            <Link href="/signup"
              className="px-7 py-3.5 rounded-2xl bg-yellow-300 text-yellow-900 font-black text-sm hover:bg-yellow-400 transition active:scale-95 shadow-lg shadow-sky-700/30">
              무료 가입하기
            </Link>
            <Link href="/login"
              className="px-7 py-3.5 rounded-2xl bg-white/20 text-white font-black text-sm hover:bg-white/30 transition active:scale-95">
              로그인
            </Link>
          </div>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="border-t border-yellow-200 py-8 text-center bg-yellow-50">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src="/wag.png" alt="logo" className="w-4 h-4 object-contain opacity-40" />
          <span className="text-slate-400 text-xs font-black tracking-widest">WAGIE</span>
        </div>
        <p className="text-slate-300 text-xs">따뜻한 대화가 시작되는 곳</p>
      </footer>

    </div>
  );
}
