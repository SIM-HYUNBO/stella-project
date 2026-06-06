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

      {/* ── 배경 오브 ── */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#fff6ee] via-[#fff0e0] to-[#fff8f0]" />
      <div className="fixed top-[-180px] right-[-180px] w-[560px] h-[560px] rounded-full bg-orange-300/25 blur-[120px] animate-[floatA_10s_ease-in-out_infinite_alternate]" />
      <div className="fixed bottom-[-220px] left-[-180px] w-[520px] h-[520px] rounded-full bg-yellow-300/25 blur-[120px] animate-[floatB_13s_ease-in-out_infinite_alternate]" />
      <div className="fixed top-[30%] left-[10%] w-[320px] h-[320px] rounded-full bg-pink-200/20 blur-[90px] animate-[floatC_8s_ease-in-out_infinite_alternate]" />
      <div className="fixed top-[60%] right-[-60px] w-[260px] h-[260px] rounded-full bg-violet-200/20 blur-[80px] animate-[floatD_11s_ease-in-out_infinite_alternate]" />
      <div className="fixed top-[15%] left-[40%] w-[200px] h-[200px] rounded-full bg-amber-200/20 blur-[60px] animate-[floatE_9s_ease-in-out_infinite_alternate]" />

      {/* ── 떠다니는 이모티콘 파티클 ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <span className="absolute top-[8%]  left-[7%]  text-2xl opacity-20 animate-[floatA_7s_ease-in-out_infinite_alternate]">💬</span>
        <span className="absolute top-[18%] right-[10%] text-xl  opacity-20 animate-[floatB_9s_ease-in-out_infinite_alternate]">✨</span>
        <span className="absolute top-[40%] left-[4%]  text-lg  opacity-15 animate-[floatC_11s_ease-in-out_infinite_alternate]">🧡</span>
        <span className="absolute top-[55%] right-[6%] text-2xl opacity-20 animate-[floatD_8s_ease-in-out_infinite_alternate]">🌸</span>
        <span className="absolute top-[72%] left-[8%]  text-xl  opacity-15 animate-[floatE_10s_ease-in-out_infinite_alternate]">⭐</span>
        <span className="absolute top-[85%] right-[12%] text-lg opacity-20 animate-[floatA_12s_ease-in-out_infinite_alternate]">🌙</span>
        <span className="absolute top-[28%] right-[20%] text-sm opacity-20 animate-[floatB_6s_ease-in-out_infinite_alternate]">💫</span>
        <span className="absolute top-[65%] left-[20%] text-sm opacity-15 animate-[floatC_14s_ease-in-out_infinite_alternate]">🔥</span>
      </div>

      <div className="relative z-10 px-5 pt-14 pb-14 space-y-8">

        {/* ── 브랜드 히어로 ── */}
        <div className="text-center">
          {/* 아이콘 + 링 */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute w-36 h-36 rounded-full border-2 border-orange-300/30 animate-[spinSlow_8s_linear_infinite]" />
            <div className="absolute w-28 h-28 rounded-full border-2 border-amber-300/40 animate-[spinSlow_5s_linear_infinite_reverse]" />
            <div className="absolute w-40 h-40 rounded-full bg-orange-300/15 blur-2xl" />
            <div className="relative w-[88px] h-[88px] rounded-[30px] bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 shadow-[0_0_0_6px_rgba(255,200,100,0.3),0_20px_60px_rgba(255,160,50,0.5)] flex items-center justify-center">
              <span className="text-5xl">💬</span>
            </div>
            {/* 스파클 */}
            <span className="absolute top-0 right-0 text-lg animate-[pulse_2s_infinite]">✨</span>
            <span className="absolute bottom-0 left-2 text-sm animate-[pulse_3s_infinite]">⭐</span>
          </div>

          <h1 className="text-[64px] font-black tracking-[0.22em] leading-none">
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-400 drop-shadow-sm">WAGIE</span>
          </h1>
          <p className="mt-3 text-[#b07848] font-bold text-base">따뜻한 대화가 시작되는 곳 🧡</p>

          {/* 라이브 뱃지 */}
          <div className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-orange-400 to-amber-300 shadow-[0_6px_20px_rgba(255,160,50,0.4)]">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-black tracking-widest">LIVE · 지금 바로 시작해요</span>
          </div>
        </div>

        {/* ── 스탯 바 ── */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: "👥", value: "1,200+", label: "활성 유저", color: "from-orange-400 to-amber-300" },
            { icon: "💬", value: "50만+",  label: "오간 메시지", color: "from-pink-400 to-rose-400" },
            { icon: "🤝", value: "3,000+", label: "친구 연결",  color: "from-violet-400 to-purple-400" },
          ].map(({ icon, value, label, color }) => (
            <div key={label} className="rounded-[20px] bg-white/75 backdrop-blur-sm border border-white/60 px-2 py-4 text-center shadow-[0_4px_16px_rgba(255,150,80,0.1)]">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-lg mx-auto mb-2 shadow-md`}>{icon}</div>
              <p className="text-[#e07020] font-black text-[17px] leading-none">{value}</p>
              <p className="text-[#c09070] text-[10px] font-semibold mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ── 채팅 미리보기 ── */}
        <div className="rounded-[28px] bg-white/65 backdrop-blur-md border border-orange-100/80 shadow-[0_12px_40px_rgba(255,150,80,0.15)] px-4 py-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-black text-[#e09040] tracking-widest">✦ LIVE PREVIEW ✦</p>
            <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />온라인</span>
          </div>

          {[
            { side: "left",  avatar: "🐣", bg: "from-orange-300 to-amber-300", msg: "오늘 진짜 힘들었다 😭",          bubble: "bg-white border border-orange-50 text-zinc-700" },
            { side: "right", avatar: "🌸", bg: "from-pink-300 to-rose-300",   msg: "고생했어... 내가 안아줄게 ☁️", bubble: "bg-gradient-to-r from-orange-400 to-amber-300 text-white" },
            { side: "left",  avatar: "🐣", bg: "from-orange-300 to-amber-300", msg: "여기 오니까 마음 편하다 🧡",    bubble: "bg-white border border-orange-50 text-zinc-700" },
            { side: "right", avatar: "🌸", bg: "from-pink-300 to-rose-300",   msg: "나도! 매일 여기서 얘기하자 ✨", bubble: "bg-gradient-to-r from-orange-400 to-amber-300 text-white" },
          ].map(({ side, avatar, bg, msg, bubble }, i) => (
            <div key={i} className={`flex items-end gap-2 ${side === "right" ? "justify-end" : ""}`}>
              {side === "left" && <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${bg} flex items-center justify-center text-lg shrink-0 shadow-md`}>{avatar}</div>}
              <div className={`max-w-[72%] rounded-[18px] ${side === "left" ? "rounded-bl-md" : "rounded-br-md"} px-4 py-3 text-sm shadow-md ${bubble}`}>{msg}</div>
              {side === "right" && <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${bg} flex items-center justify-center text-lg shrink-0 shadow-md`}>{avatar}</div>}
            </div>
          ))}
        </div>

        {/* ── 기능 카드 2×2 ── */}
        <div>
          <p className="font-black text-[#3d1f00] text-base mb-3 px-1">이런 게 있어요 ✨</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { grad: "from-red-400 via-orange-400 to-amber-300", shadow: "rgba(255,100,50,0.35)",  icon: "💬", title: "1:1 채팅",   sub: "친구와 나만의\n소중한 대화" },
              { grad: "from-yellow-400 to-orange-400",             shadow: "rgba(255,180,30,0.35)", icon: "👥", title: "단체채팅",  sub: "친구들 모두\n같이 얘기해요" },
              { grad: "from-pink-400 to-rose-500",                 shadow: "rgba(255,100,160,0.3)", icon: "📔", title: "다이어리",  sub: "오늘 하루를\n글로 남겨봐요" },
              { grad: "from-violet-400 to-purple-500",             shadow: "rgba(150,80,255,0.3)",  icon: "🤝", title: "친구 맺기", sub: "새로운 인연을\n만들어봐요" },
            ].map(({ grad, shadow, icon, title, sub }) => (
              <div key={title} className={`rounded-[24px] bg-gradient-to-br ${grad} px-5 py-5 shadow-[0_10px_30px_${shadow}] relative overflow-hidden`}>
                <div className="absolute top-[-20px] right-[-20px] w-24 h-24 rounded-full bg-white/10" />
                <div className="w-11 h-11 rounded-xl bg-white/25 flex items-center justify-center text-2xl mb-3 shadow-inner">{icon}</div>
                <p className="text-white font-black text-base">{title}</p>
                <p className="text-white/70 text-xs mt-1 whitespace-pre-line">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── WHY WAGIE 배너 ── */}
        <div className="rounded-[30px] overflow-hidden shadow-[0_20px_60px_rgba(255,160,50,0.4)] relative">
          <div className="bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 px-6 py-7 relative">
            <div className="absolute top-[-40px] right-[-40px] w-52 h-52 rounded-full bg-white/10" />
            <div className="absolute bottom-[-30px] left-[-30px] w-36 h-36 rounded-full bg-white/10" />
            <div className="absolute top-4 right-4 text-3xl opacity-40 animate-[pulse_3s_infinite]">🌟</div>
            <div className="relative">
              <p className="text-white/75 text-[10px] font-black tracking-[0.2em] mb-2">WHY WAGIE?</p>
              <p className="text-white font-black text-2xl leading-snug">어떤 날도<br />혼자가 아니에요 🌙</p>
              <p className="text-white/75 text-sm mt-3 leading-relaxed">기쁜 날도, 힘든 날도<br />늘 곁에 있는 친구들과 함께해요.</p>
              <div className="mt-4 flex gap-2 flex-wrap">
                {["따뜻함 🧡", "즐거움 ✨", "함께 👫", "매일 🌅"].map((t) => (
                  <span key={t} className="px-3 py-1.5 rounded-full bg-white/25 backdrop-blur-sm text-white text-xs font-bold shadow-sm">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── 알림 소개 ── */}
        <div className="rounded-[24px] bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 px-5 py-5 flex items-center gap-4 shadow-sm">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-3xl shadow-lg">🔔</div>
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-white text-white text-[9px] font-black flex items-center justify-center shadow">3</span>
          </div>
          <div>
            <p className="font-black text-[#3d1f00] text-base">실시간 알림</p>
            <p className="text-[#9070a0] text-sm mt-0.5">메시지가 오면 앱 아이콘에<br />숫자로 바로 알려드려요.</p>
          </div>
        </div>

        {/* ── 버튼 ── */}
        <div className="space-y-3 pt-2">
          <Link href="/login"
            className="group relative flex items-center justify-center h-16 rounded-[24px] overflow-hidden shadow-[0_14px_50px_rgba(255,160,50,0.5)] active:scale-[0.98] transition-transform">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400" />
            <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.2)_50%,transparent_60%)] animate-[shimmer_3s_infinite]" />
            <span className="relative text-white text-xl font-black tracking-wide drop-shadow">로그인</span>
            <span className="absolute right-6 text-2xl">💭</span>
          </Link>

          <Link href="/signup"
            className="group flex items-center justify-center h-16 rounded-[24px] bg-white/90 backdrop-blur-sm border-2 border-orange-200 shadow-[0_6px_24px_rgba(255,150,80,0.2)] active:scale-[0.98] transition-transform relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-50 to-amber-50 opacity-0 group-hover:opacity-100 transition" />
            <span className="relative text-[#c07030] text-xl font-black tracking-wide">회원가입</span>
            <span className="absolute right-6 text-xl">✨</span>
          </Link>
        </div>

        <p className="text-center text-sm text-[#d4a57a] font-medium pb-2">✦ 친구들과, 마음을 나눠요 ✦</p>

      </div>

      <style>{`
        @keyframes floatA { 0%{transform:translate(0,0) rotate(0deg)} 100%{transform:translate(-30px,40px) rotate(10deg)} }
        @keyframes floatB { 0%{transform:translate(0,0) rotate(0deg)} 100%{transform:translate(40px,-30px) rotate(-8deg)} }
        @keyframes floatC { 0%{transform:translate(0,0) rotate(0deg)} 100%{transform:translate(-20px,25px) rotate(5deg)} }
        @keyframes floatD { 0%{transform:translate(0,0)} 100%{transform:translate(-25px,-35px)} }
        @keyframes floatE { 0%{transform:translate(0,0)} 100%{transform:translate(20px,30px)} }
        @keyframes spinSlow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </main>
  );
}
