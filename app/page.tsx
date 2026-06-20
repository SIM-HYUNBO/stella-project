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
      <div className="min-h-screen flex items-center justify-center bg-sky-50">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-[6px] border-sky-300" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border-[6px] border-transparent border-t-sky-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f8ff] font-sans">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-sky-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
              <img src="/wag.png" alt="logo" className="w-5 h-5 object-contain" />
            </div>
            <span className="text-sky-500 font-black text-xl tracking-widest">WAGIE</span>
          </Link>

          {/* 데스크탑 nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-sky-500 transition">기능</a>
            <a href="#about" className="hover:text-sky-500 transition">소개</a>
            <Link href="/login" className="hover:text-sky-500 transition">로그인</Link>
            <Link href="/signup"
              className="px-5 py-2 rounded-full bg-sky-500 text-white font-bold hover:bg-sky-600 transition shadow-sm shadow-sky-200">
              지금 시작하기
            </Link>
          </nav>

          {/* 모바일 버튼 */}
          <Link href="/login"
            className="md:hidden px-4 py-2 rounded-full bg-sky-500 text-white text-sm font-bold">
            시작하기
          </Link>
        </div>
      </header>

      {/* ── 히어로 ── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">

        {/* 왼쪽 텍스트 */}
        <div>
          {/* 뱃지 */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-sky-200 text-xs font-semibold text-slate-600 mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            v0.3 · 실시간 채팅 & 다이어리 서비스
          </div>

          {/* 헤드라인 */}
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.1] mb-6">
            언제 어디서나<br />
            <span className="text-sky-500">소통하고,<br />연결됩니다.</span>
          </h1>

          <p className="text-slate-500 text-base leading-relaxed mb-10 max-w-md">
            1:1 채팅 · 다이어리 · 친구 연결 · 단체채팅까지.<br />
            모바일과 데스크탑에서 동일한 소통 경험을 제공해요.
          </p>

          {/* CTA 버튼 */}
          <div className="flex items-center gap-4 mb-12">
            <Link href="/signup"
              className="flex items-center gap-2 px-7 py-3.5 rounded-full bg-sky-500 text-white font-bold text-sm hover:bg-sky-600 transition shadow-lg shadow-sky-200 active:scale-95">
              → 지금 시작하기
            </Link>
            <Link href="/login"
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:border-sky-300 transition active:scale-95">
              로그인
            </Link>
          </div>

          {/* 유저 수 */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["sky", "purple", "cyan", "indigo"].map((c, i) => (
                <div key={i} className={`w-9 h-9 rounded-full bg-${c}-400 border-2 border-white flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                  {["W", "A", "G", "I"][i]}
                </div>
              ))}
            </div>
            <div>
              <p className="text-slate-800 font-black text-sm">1,200+ 사용자</p>
              <p className="text-slate-400 text-xs">지금도 가입하고 있어요</p>
            </div>
          </div>
        </div>

        {/* 오른쪽: 폰 목업 */}
        <div className="flex justify-center md:justify-end">
          <div className="relative w-[280px]">
            {/* 배경 글로우 */}
            <div className="absolute inset-0 bg-sky-300/20 blur-3xl rounded-full scale-110" />

            {/* 폰 */}
            <div className="relative bg-white rounded-[36px] shadow-2xl shadow-sky-200/60 border border-slate-100 overflow-hidden">
              {/* 폰 상단 노치 */}
              <div className="h-7 bg-white flex items-center justify-center">
                <div className="w-16 h-4 rounded-full bg-slate-100" />
              </div>

              {/* 앱 헤더 */}
              <div className="px-5 py-3 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-2">
                  <img src="/wag.png" alt="logo" className="w-4 h-4 object-contain" />
                  <span className="text-sky-500 font-black text-sm tracking-widest">WAGIE</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400" />
              </div>

              {/* 채팅 목록 */}
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 mb-3 tracking-wider">채팅</p>
                {[
                  { icon: "💬", color: "bg-sky-400",    name: "1:1 채팅",   sub: "친구와 나만의 대화",    badge: 1 },
                  { icon: "👥", color: "bg-amber-400",  name: "단체채팅",   sub: "같이 얘기해요",         badge: 2 },
                  { icon: "📔", color: "bg-purple-400", name: "다이어리",   sub: "오늘을 기록해요",       badge: 3 },
                  { icon: "📋", color: "bg-emerald-400",name: "회의방",     sub: "주제 고정 · 긴급회의",  badge: 0 },
                ].map(({ icon, color, name, sub, badge }) => (
                  <div key={name} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-base shadow-sm shrink-0`}>{icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800">{name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{sub}</p>
                    </div>
                    {badge > 0 && (
                      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">{badge}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* 폰 하단 nav */}
              <div className="px-4 py-3 border-t border-slate-100 flex justify-around">
                {["💬", "👥", "📔", "🤝", "⚙️"].map((icon, i) => (
                  <div key={i} className={`text-base ${i === 0 ? "opacity-100" : "opacity-30"}`}>{icon}</div>
                ))}
              </div>

              {/* 폰 하단 홈 바 */}
              <div className="h-5 flex items-center justify-center">
                <div className="w-20 h-1 rounded-full bg-slate-200" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 기능 카드 ── */}
      <section id="features" className="bg-white border-t border-slate-100 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-sky-500 font-bold text-sm tracking-widest mb-3">FEATURES</p>
            <h2 className="text-3xl font-black text-slate-900">이런 기능이 있어요</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { icon: "💬", iconBg: "bg-sky-50",    title: "1:1 채팅",  desc: "친구와 나만의 실시간 대화" },
              { icon: "👥", iconBg: "bg-amber-50",  title: "단체채팅",  desc: "여럿이 함께하는 그룹 채팅방" },
              { icon: "📔", iconBg: "bg-purple-50", title: "다이어리",  desc: "오늘 하루를 글로 기록해요" },
              { icon: "📋", iconBg: "bg-emerald-50",title: "회의방",    desc: "주제 고정 · 긴급회의 알림" },
            ].map(({ icon, iconBg, title, desc }) => (
              <div key={title} className="bg-white border border-slate-100 rounded-[24px] p-6 hover:shadow-md hover:border-sky-100 transition-all">
                <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center text-2xl mb-5`}>{icon}</div>
                <p className="font-black text-slate-800 text-base mb-2">{title}</p>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="border-t border-slate-100 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src="/wag.png" alt="logo" className="w-5 h-5 object-contain opacity-50" />
          <span className="text-slate-400 text-sm font-bold tracking-widest">WAGIE</span>
        </div>
        <p className="text-slate-300 text-xs">따뜻한 대화가 시작되는 곳</p>
      </footer>

    </div>
  );
}
