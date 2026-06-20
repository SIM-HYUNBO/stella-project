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
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-2 gap-16 items-center">

        {/* 왼쪽 */}
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-200 text-yellow-800 text-xs font-bold mb-8">
            ✦ 친구들과 매일 소통해요
          </div>

          <h1 className="text-5xl md:text-[56px] font-black text-slate-900 leading-[1.1] mb-6">
            대화가<br />
            <span className="text-sky-500">즐거워지는</span><br />
            <span className="relative inline-block">
              공간
              <span className="absolute -bottom-1 left-0 w-full h-3 bg-yellow-300 -z-10 rounded" />
            </span>
          </h1>

          <p className="text-slate-500 text-base leading-relaxed mb-10 max-w-sm">
            1:1 채팅부터 단체방, 다이어리, 회의방까지.
            <br />친구들과의 모든 순간을 담아요.
          </p>

          <div className="flex flex-wrap gap-3 mb-12">
            <Link href="/signup"
              className="px-7 py-3.5 rounded-2xl bg-sky-500 text-white font-black text-sm hover:bg-sky-600 transition shadow-lg shadow-sky-200 active:scale-95">
              무료로 시작하기 →
            </Link>
            <Link href="/login"
              className="px-7 py-3.5 rounded-2xl bg-yellow-300 text-yellow-900 font-black text-sm hover:bg-yellow-400 transition active:scale-95">
              로그인
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[
                "bg-sky-400", "bg-yellow-400", "bg-sky-500", "bg-amber-400",
              ].map((c, i) => (
                <div key={i} className={`w-9 h-9 rounded-full ${c} border-2 border-yellow-50 flex items-center justify-center text-white text-xs font-black shadow`}>
                  {["W","A","G","I"][i]}
                </div>
              ))}
            </div>
            <div>
              <p className="text-slate-700 font-black text-sm">1,200+ 사용자</p>
              <p className="text-slate-400 text-xs">지금도 함께하고 있어요</p>
            </div>
          </div>
        </div>

        {/* 오른쪽: 폰 목업 */}
        <div className="flex justify-center md:justify-end">
          <div className="relative w-[270px]">
            <div className="absolute -inset-4 bg-yellow-200/60 blur-3xl rounded-full" />
            <div className="absolute top-4 -right-6 w-24 h-24 rounded-full bg-sky-200/50 blur-2xl" />

            <div className="relative bg-white rounded-[40px] shadow-2xl shadow-yellow-200/80 border-4 border-yellow-100 overflow-hidden">
              <div className="h-6 bg-yellow-50 flex items-center justify-center">
                <div className="w-14 h-3 rounded-full bg-yellow-100" />
              </div>

              {/* 앱 헤더 */}
              <div className="bg-sky-500 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <img src="/wag.png" alt="logo" className="w-4 h-4 object-contain brightness-0 invert" />
                  <span className="text-white font-black text-sm tracking-widest">WAGIE</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-white/40" />
                </div>
              </div>

              {/* 채팅 목록 */}
              <div className="bg-yellow-50 px-4 pt-3 pb-1">
                <p className="text-[9px] font-black text-yellow-600 tracking-widest mb-2">채팅</p>
              </div>
              <div className="divide-y divide-slate-50">
                {[
                  { emoji: "💬", bg: "bg-sky-100",    name: "친구",      last: "오늘 뭐해?",         badge: 2, time: "방금" },
                  { emoji: "👥", bg: "bg-yellow-100", name: "우리방",    last: "다들 어디야~~",       badge: 5, time: "1분" },
                  { emoji: "📔", bg: "bg-sky-50",     name: "내 다이어리", last: "오늘 날씨가 너무 좋",  badge: 0, time: "오늘" },
                  { emoji: "📋", bg: "bg-yellow-50",  name: "회의방",    last: "다음 주 일정 공유",   badge: 1, time: "어제" },
                ].map(({ emoji, bg, name, last, badge, time }) => (
                  <div key={name} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                    <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center text-base shrink-0`}>{emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800">{name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{last}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <p className="text-[9px] text-slate-300">{time}</p>
                      {badge > 0 && (
                        <span className="min-w-[16px] h-4 rounded-full bg-sky-500 text-white text-[9px] font-black flex items-center justify-center px-1">{badge}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 폰 하단 nav */}
              <div className="px-4 py-2 border-t border-yellow-100 bg-yellow-50 flex justify-around">
                {["🏠","💬","👥","📔","⚙️"].map((icon, i) => (
                  <div key={i} className={`text-sm p-1 rounded-lg ${i === 0 ? "bg-sky-100" : ""}`}>{icon}</div>
                ))}
              </div>
              <div className="h-4 bg-white flex items-center justify-center">
                <div className="w-16 h-0.5 rounded-full bg-slate-200" />
              </div>
            </div>
          </div>
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "💬", accent: "border-sky-300  bg-sky-50",  iconBg: "bg-sky-100",    title: "1:1 채팅",  desc: "친구와 나만의 실시간 대화" },
              { icon: "👥", accent: "border-yellow-300 bg-yellow-50", iconBg: "bg-yellow-100", title: "단체채팅",  desc: "여럿이 함께하는 그룹 채팅" },
              { icon: "📔", accent: "border-sky-200  bg-sky-50",  iconBg: "bg-sky-50",     title: "다이어리",  desc: "오늘 하루를 글로 기록해요" },
              { icon: "📋", accent: "border-yellow-200 bg-yellow-50", iconBg: "bg-yellow-50",  title: "회의방",    desc: "주제 고정 · 긴급회의 알림" },
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
