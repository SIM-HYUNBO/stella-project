"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const EMOJI_LIST = [
  "⭐","🌟","✨","💫","🎨","🖌️","🎭","🎪","🦋","🌸",
  "🌺","🌼","🍀","🎈","🎉","🎊","💎","👑","🔮","🌈",
  "⚡","🔥","💜","💙","💖","🦄","🐱","🐶","🌙","☀️",
  "🌊","🍉","🎵","🎶","🏆","🎯","🐸","🍕","🌻","🦊",
];

type Decor = { id: string; emoji: string; x: number; y: number };

export default function CreativePage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 꾸미기
  const [decor, setDecor] = useState<Decor[]>([]);
  const [decorMode, setDecorMode] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string>("⭐");
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setNickname(snap.data().nickname || "유저");
        setDecor(snap.data().creativeDecor || []);
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

  const saveDecor = async (next: Decor[]) => {
    if (!uid) return;
    try { await updateDoc(doc(db, "users", uid), { creativeDecor: next }); } catch {}
  };

  const handlePageTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (!decorMode) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-ui]")) return;
    if (decor.length >= 20) return;

    const rect = pageRef.current!.getBoundingClientRect();
    let cx: number, cy: number;
    if ("touches" in e) {
      cx = (e as React.TouchEvent).touches[0].clientX;
      cy = (e as React.TouchEvent).touches[0].clientY;
    } else {
      cx = (e as React.MouseEvent).clientX;
      cy = (e as React.MouseEvent).clientY;
    }
    const x = ((cx - rect.left) / rect.width) * 100;
    const y = ((cy - rect.top) / rect.height) * 100;
    const next = [...decor, { id: `${Date.now()}`, emoji: selectedEmoji, x, y }];
    setDecor(next);
    saveDecor(next);
  };

  const removeDecor = (id: string) => {
    const next = decor.filter(d => d.id !== id);
    setDecor(next);
    saveDecor(next);
  };

  const MENU_ITEMS = [
    { icon: "🖌️", label: "단체 협업 그림", path: "/creative/draw", sub: "함께 그림을 그려요", badge: "NEW" },
    { icon: "✍️", label: "스토리 이어쓰기", path: "/creative/story", sub: "번갈아가며 이야기를 써요", badge: "NEW" },
    { icon: "📷", label: "사진에 그림 그리기", path: "/creative/photo-draw", sub: "사진 위에 그림을 덧입혀요", badge: null },
    { icon: "🗂️", label: "창작 갤러리", path: "/creative/gallery", sub: "완성된 작품을 모아봐요", badge: null },
  ];

  return (
    <div
      ref={pageRef}
      className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #fdf4ff 0%, #fef9ec 50%, #f0f9ff 100%)" }}
      onClick={handlePageTap}
      onTouchStart={handlePageTap}
    >
      {/* 배경 블롭 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-80px] right-[-60px] w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: "#d8b4fe" }} />
        <div className="absolute top-[40%] left-[-80px] w-64 h-64 rounded-full blur-3xl opacity-20" style={{ background: "#fde68a" }} />
        <div className="absolute bottom-[-60px] right-[20%] w-56 h-56 rounded-full blur-3xl opacity-25" style={{ background: "#a5f3fc" }} />
      </div>

      {/* 배치된 이모지들 */}
      {decor.map((d) => (
        <div
          key={d.id}
          className="absolute select-none z-[5] pointer-events-none"
          style={{ left: `${d.x}%`, top: `${d.y}%`, transform: "translate(-50%, -50%)", fontSize: 28 }}
        >
          {d.emoji}
          {decorMode && (
            <button
              data-ui
              className="absolute -top-2 -right-2 w-4 h-4 bg-red-400 rounded-full text-white text-[9px] flex items-center justify-center pointer-events-auto active:scale-90 transition-transform z-10"
              onClick={(e) => { e.stopPropagation(); removeDecor(d.id); }}
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {/* 헤더 */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4" data-ui>
        <div>
          <p className="text-slate-400 text-xs font-semibold tracking-widest uppercase">Creative</p>
          <h1 className="text-2xl font-black text-slate-800 mt-0.5">
            {nickname ? `${nickname}의 공간` : "창작 공간"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/home")}
            className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center active:scale-90 transition-transform"
            title="채팅 공간"
          >
            <span className="text-base">💬</span>
          </button>
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
      <div className="relative z-10 px-5 mt-4 space-y-5 pb-32" data-ui>

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
                  <p className="text-purple-400 text-xs mt-0.5">{item.sub}</p>
                </div>
                {item.badge && (
                  <span className="bg-purple-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 꾸미기 버튼 (우측 하단) */}
      {!decorMode && (
        <button
          data-ui
          onClick={(e) => { e.stopPropagation(); setDecorMode(true); }}
          className="fixed bottom-8 right-5 z-20 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl active:scale-90 transition-transform"
          style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}
        >
          🪄
        </button>
      )}

      {/* 꾸미기 편집 모드 패널 */}
      {decorMode && (
        <div
          data-ui
          className="fixed bottom-0 left-0 right-0 z-20 rounded-t-[24px] shadow-2xl px-4 pt-4 pb-6"
          style={{ background: "linear-gradient(180deg, #fdf4ff 0%, #fff 100%)", border: "1px solid rgba(168,85,247,0.15)" }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-black text-slate-800 text-sm">이모지 고르고 화면 탭 🪄</p>
              <p className="text-slate-400 text-xs mt-0.5">{decor.length}/20개 · 이모지 탭하면 삭제</p>
            </div>
            <button
              onClick={() => setDecorMode(false)}
              className="px-4 py-2 rounded-2xl text-white text-sm font-black active:scale-95 transition"
              style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}
            >
              완료
            </button>
          </div>

          {/* 이모지 그리드 */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setSelectedEmoji(emoji)}
                className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-xl active:scale-90 transition-all"
                style={{
                  background: selectedEmoji === emoji
                    ? "linear-gradient(135deg, #a855f7, #ec4899)"
                    : "rgba(243,232,255,0.6)",
                  border: selectedEmoji === emoji ? "none" : "1px solid rgba(168,85,247,0.2)",
                  boxShadow: selectedEmoji === emoji ? "0 2px 8px rgba(168,85,247,0.35)" : "none",
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

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
          <div className="flex items-center justify-between mb-8">
            <p className="font-black text-slate-800 text-lg">메뉴</p>
            <button onClick={() => setMenuOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-lg active:scale-90 transition-transform">
              ✕
            </button>
          </div>

          <div className="flex items-center gap-3 mb-8 p-4 rounded-2xl bg-white/70 border border-purple-100">
            <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-lg font-black text-purple-600">
              {nickname?.[0] ?? "?"}
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm">{nickname}</p>
              <p className="text-purple-400 text-xs">창작 공간</p>
            </div>
          </div>

          <div className="space-y-2 flex-1">
            {MENU_ITEMS.map((item) => (
              <button key={item.path} onClick={() => { setMenuOpen(false); router.push(item.path); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/60 border border-purple-100 active:scale-[0.98] transition-transform text-left">
                <span className="text-xl">{item.icon}</span>
                <span className="font-bold text-slate-700 text-sm flex-1">{item.label}</span>
                {item.badge && <span className="bg-purple-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{item.badge}</span>}
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t border-purple-100">
            <button onClick={() => { setMenuOpen(false); router.push("/home"); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-sky-50 border border-sky-100 active:scale-[0.98] transition-transform">
              <span className="text-xl">💬</span>
              <span className="font-bold text-sky-600 text-sm">채팅 공간으로</span>
            </button>
            <button onClick={() => { setMenuOpen(false); router.push("/profile"); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/60 border border-slate-100 active:scale-[0.98] transition-transform">
              <span className="text-xl">👤</span>
              <span className="font-bold text-slate-600 text-sm">프로필</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
