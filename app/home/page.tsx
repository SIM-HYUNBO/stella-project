"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import HamburgerMenuWithDelete from "@/components/hamburger";
import TextAvatar from "@/components/TextAvatar";

const MENUS = [
  { href: "/avatar",     icon: "💬", label: "1:1 채팅",  bg: "from-violet-400 to-purple-500" },
  { href: "/groupchat",  icon: "👥", label: "단체 채팅",  bg: "from-pink-400 to-rose-500" },
  { href: "/friendmenu", icon: "🤝", label: "친구 목록",  bg: "from-sky-400 to-blue-500" },
  { href: "/diary",      icon: "📔", label: "다이어리",   bg: "from-emerald-400 to-teal-500" },
];

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("안녕하세요");

  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) setGreeting("좋은 아침이에요");
    else if (h >= 12 && h < 18) setGreeting("좋은 오후예요");
    else if (h >= 18 && h < 22) setGreeting("좋은 저녁이에요");
    else setGreeting("늦은 밤이네요");
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <HamburgerMenuWithDelete />

      {/* 상단 배너 */}
      <div
        className="relative px-6 pt-14 pb-10 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #9b59b6 50%, #e91e8c 100%)",
        }}
      >
        {/* 배경 원형 장식 */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-20"
          style={{ background: "rgba(255,255,255,0.3)" }} />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-15"
          style={{ background: "rgba(255,255,255,0.3)" }} />

        <div className="relative flex items-center gap-4">
          <button onClick={() => router.push("/profile")}>
            <TextAvatar
              nickname={nickname || "?"}
              size={56}
              profileImage={profileImage}
            />
          </button>
          <div>
            <p className="text-white/80 text-sm font-medium">{greeting} 👋</p>
            <p className="text-white text-xl font-bold mt-0.5">
              {nickname ?? "..."}
            </p>
          </div>
        </div>

        {/* 앱 로고 */}
        <div className="relative mt-8">
          <p className="text-white/60 text-xs font-semibold tracking-widest uppercase">WAGIE</p>
          <p className="text-white text-2xl font-black mt-1">무엇을 할까요?</p>
        </div>
      </div>

      {/* 메뉴 그리드 */}
      <div className="px-5 -mt-5">
        <div className="grid grid-cols-2 gap-3">
          {MENUS.map(({ href, icon, label, bg }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`relative bg-gradient-to-br ${bg} rounded-3xl p-5 text-left shadow-lg active:scale-95 transition-transform overflow-hidden`}
            >
              <div className="absolute -bottom-4 -right-4 text-6xl opacity-20 select-none">{icon}</div>
              <span className="text-3xl">{icon}</span>
              <p className="text-white font-bold text-base mt-3">{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 하단 추가 메뉴 */}
      <div className="px-5 mt-4 pb-10">
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          {[
            { href: "/tools",   icon: "⚙️", label: "설정" },
            { href: "/profile", icon: "👤", label: "내 프로필" },
          ].map(({ href, icon, label }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="w-full flex items-center gap-4 px-5 py-4 border-b last:border-b-0 active:bg-gray-50"
            >
              <span className="text-2xl">{icon}</span>
              <span className="font-medium text-gray-700">{label}</span>
              <span className="ml-auto text-gray-300">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
