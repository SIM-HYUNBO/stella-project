"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function CreativePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setNickname(snap.data().nickname || "유저");
        setProfileImage(snap.data().profileImage || null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const MENU_ITEMS = [
    { icon: "🖌️", label: "단체 협업 그림", path: "/creative/draw", badge: "NEW" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "linear-gradient(160deg, #fdf4ff 0%, #fef9ec 50%, #f0f9ff 100%)" }}>

      {/* 배경 블롭 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-80px] right-[-60px] w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: "#d8b4fe" }} />
        <div className="absolute top-[40%] left-[-80px] w-64 h-64 rounded-full blur-3xl opacity-20" style={{ background: "#fde68a" }} />
        <div className="absolute bottom-[-60px] right-[20%] w-56 h-56 rounded-full blur-3xl opacity-25" style={{ background: "#a5f3fc" }} />
      </div>

      {/* 헤더 */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <div>
          <p className="text-slate-400 text-xs font-semibold tracking-widest uppercase">Creative</p>
          <h1 className="text-2xl font-black text-slate-800 mt-0.5">
            {nickname ? `${nickname}의 공간` : "창작 공간"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* 채팅으로 이동 */}
          <button
            onClick={() => router.push("/home")}
            className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center active:scale-90 transition-transform"
            title="채팅 공간"
          >
            <span className="text-base">💬</span>
          </button>
          {/* 햄버거 */}
          <button
            onClick={() => setMenuOpen(true)}
            className="w-9 h-9 rounded-full bg-white/80 border border-purple-100 flex flex-col items-center justify-center gap-1 active:scale-90 transition-transform shadow-sm"
          >
            <span className="w-4 h-0.5 bg-slate-600 rounded-full block" />
            <span className="w-4 h-0.5 bg-slate-600 rounded-full block" />
            <span className="w-3 h-0.5 bg-slate-600 rounded-full block self-start ml-[10px]" />
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 px-5 mt-4 space-y-5">

        {/* 인사 카드 */}
        <div className="rounded-[28px] overflow-hidden" style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>
          <div className="px-6 py-6 flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs font-semibold mb-1">오늘도 멋진 하루</p>
              <p className="text-white font-black text-xl leading-snug">무언가를 만들어<br/>볼까요? ✨</p>
            </div>
            <div className="text-6xl opacity-80">🎨</div>
          </div>
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.3), transparent)" }} />
        </div>

        {/* 메뉴 바로가기 */}
        <div>
          <p className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-3">메뉴</p>
          <div className="space-y-3">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="w-full rounded-[20px] bg-white/80 backdrop-blur-sm border border-purple-100 px-5 py-4 flex items-center gap-4 active:scale-[0.98] transition-transform shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: "linear-gradient(135deg, #f3e8ff, #fce7f3)" }}>
                  {item.icon}
                </div>
                <div className="text-left flex-1">
                  <p className="text-slate-800 font-black text-base">{item.label}</p>
                  <p className="text-purple-400 text-xs mt-0.5">함께 그림을 그려요</p>
                </div>
                {item.badge && (
                  <span className="bg-purple-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 드로어 오버레이 */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
      )}

      {/* 드로어 메뉴 */}
      <div
        ref={menuRef}
        className={`fixed top-0 right-0 h-full w-72 z-50 transition-transform duration-300 ${menuOpen ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: "linear-gradient(180deg, #fdf4ff 0%, #fef9ec 100%)" }}
      >
        <div className="px-6 pt-14 pb-6 h-full flex flex-col">
          {/* 드로어 헤더 */}
          <div className="flex items-center justify-between mb-8">
            <p className="font-black text-slate-800 text-lg">메뉴</p>
            <button onClick={() => setMenuOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-lg active:scale-90 transition-transform">
              ✕
            </button>
          </div>

          {/* 프로필 미니 */}
          <div className="flex items-center gap-3 mb-8 p-4 rounded-2xl bg-white/70 border border-purple-100">
            <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-lg font-black text-purple-600">
              {nickname?.[0] ?? "?"}
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm">{nickname}</p>
              <p className="text-purple-400 text-xs">창작 공간</p>
            </div>
          </div>

          {/* 메뉴 아이템 */}
          <div className="space-y-2 flex-1">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.path}
                onClick={() => { setMenuOpen(false); router.push(item.path); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/60 border border-purple-100 active:scale-[0.98] transition-transform text-left"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-bold text-slate-700 text-sm flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-purple-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{item.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* 하단 이동 버튼 */}
          <div className="space-y-2 pt-4 border-t border-purple-100">
            <button
              onClick={() => { setMenuOpen(false); router.push("/home"); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-sky-50 border border-sky-100 active:scale-[0.98] transition-transform"
            >
              <span className="text-xl">💬</span>
              <span className="font-bold text-sky-600 text-sm">채팅 공간으로</span>
            </button>
            <button
              onClick={() => { setMenuOpen(false); router.push("/profile"); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/60 border border-slate-100 active:scale-[0.98] transition-transform"
            >
              <span className="text-xl">👤</span>
              <span className="font-bold text-slate-600 text-sm">프로필</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatA { 0%{transform:translate(0,0)} 100%{transform:translate(-20px,30px)} }
        @keyframes floatB { 0%{transform:translate(0,0)} 100%{transform:translate(25px,-20px)} }
      `}</style>
    </div>
  );
}
