"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import HamburgerMenuWithDelete from "@/components/hamburger";
import TextAvatar from "@/components/TextAvatar";

const MENUS = [
  { href: "/avatar",     icon: "💬", label: "1:1 채팅" },
  { href: "/groupchat",  icon: "👥", label: "단체 채팅" },
  { href: "/friendmenu", icon: "🤝", label: "친구 목록" },
  { href: "/diary",      icon: "📔", label: "다이어리" },
];

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("안녕하세요");

  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) setGreeting("좋은 아침이에요 ☀️");
    else if (h >= 12 && h < 18) setGreeting("좋은 오후예요 🌤");
    else if (h >= 18 && h < 22) setGreeting("좋은 저녁이에요 🌙");
    else setGreeting("늦은 밤이네요 🌟");
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
    <div style={{ minHeight: "100vh", background: "#fff9f5" }}>
      <HamburgerMenuWithDelete />

      {/* 상단 물결 헤더 */}
      <div style={{ position: "relative", paddingBottom: 60 }}>
        <div style={{
          background: "linear-gradient(135deg, #FFB347 0%, #FFD580 40%, #FF9A8B 75%, #FFB6C1 100%)",
          borderRadius: "0 0 48px 48px",
          padding: "56px 24px 72px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* 장식 원 */}
          <div style={{
            position: "absolute", top: -40, right: -40,
            width: 160, height: 160, borderRadius: "50%",
            background: "rgba(255,255,255,0.18)",
          }} />
          <div style={{
            position: "absolute", bottom: 10, left: -30,
            width: 120, height: 120, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
          }} />
          <div style={{
            position: "absolute", top: 30, left: "40%",
            width: 80, height: 80, borderRadius: "50%",
            background: "rgba(255,255,255,0.10)",
          }} />

          {/* 유저 정보 */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => router.push("/profile")} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}>
              <div style={{
                width: 54, height: 54, borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.7)",
                overflow: "hidden", flexShrink: 0,
              }}>
                <TextAvatar nickname={nickname || "?"} size={54} profileImage={profileImage} />
              </div>
            </button>
            <div>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600, margin: 0 }}>{greeting}</p>
              <p style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "2px 0 0" }}>
                {nickname ?? "..."}
              </p>
            </div>
          </div>

          {/* 앱 이름 */}
          <div style={{ position: "relative", marginTop: 28 }}>
            <p style={{
              color: "#fff", fontSize: 36, fontWeight: 900, margin: 0,
              letterSpacing: -1,
              textShadow: "0 2px 12px rgba(255,150,100,0.3)",
            }}>WAGIE 🧡</p>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: 500, margin: "4px 0 0" }}>
              오늘도 친구들과 함께해요
            </p>
          </div>
        </div>

        {/* 플로팅 메뉴 카드 */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "0 20px",
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}>
          {MENUS.map(({ href, icon, label }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              style={{
                background: "#fff",
                borderRadius: 24,
                padding: "18px 16px",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                boxShadow: "0 4px 24px rgba(255,150,100,0.15), 0 1px 4px rgba(0,0,0,0.06)",
                transition: "transform 0.15s",
              }}
              onMouseDown={e => (e.currentTarget.style.transform = "scale(0.96)")}
              onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
              onTouchStart={e => (e.currentTarget.style.transform = "scale(0.96)")}
              onTouchEnd={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              <span style={{ fontSize: 28 }}>{icon}</span>
              <p style={{ color: "#3d2c2c", fontWeight: 700, fontSize: 14, margin: "8px 0 0" }}>{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 하단 메뉴 */}
      <div style={{ padding: "8px 20px 32px" }}>
        <div style={{
          background: "#fff",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 2px 16px rgba(255,150,100,0.1)",
        }}>
          {[
            { href: "/profile", icon: "👤", label: "내 프로필" },
            { href: "/tools",   icon: "⚙️", label: "설정" },
          ].map(({ href, icon, label }, i, arr) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                gap: 14, padding: "16px 20px", background: "none",
                border: "none", borderBottom: i < arr.length - 1 ? "1px solid #fff0eb" : "none",
                cursor: "pointer", textAlign: "left",
              }}
            >
              <span style={{ fontSize: 22 }}>{icon}</span>
              <span style={{ fontWeight: 600, color: "#3d2c2c", fontSize: 15 }}>{label}</span>
              <span style={{ marginLeft: "auto", color: "#ffb89a", fontSize: 18 }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
