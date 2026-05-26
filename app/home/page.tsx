"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where, onSnapshot } from "firebase/firestore";
import HamburgerMenuWithDelete from "@/components/hamburger";
import TextAvatar from "@/components/TextAvatar";

type Friend = { uid: string; nickname: string; profileImage: string | null };

type WeatherTheme = {
  bg: string;
  orb1: string;
  orb2: string;
  icon: string;
  text: string;
  particle?: string;
};

function getWeatherTheme(code: number): WeatherTheme {
  if (code === 0) return { bg: "linear-gradient(160deg,#fff9ef,#fff3e0,#fffbf0)", orb1: "#ffd58060", orb2: "#ffb34760", icon: "☀️", text: "맑고 화창한 날이에요", particle: "✦" };
  if (code <= 3) return { bg: "linear-gradient(160deg,#f0f4ff,#e8edf8,#f5f7ff)", orb1: "#c5cfe060", orb2: "#a8bcd060", icon: "⛅", text: "구름이 조금 있어요" };
  if (code <= 48) return { bg: "linear-gradient(160deg,#e8ecf0,#dde2e8,#eaeef2)", orb1: "#b0bcc860", orb2: "#8fa0b060", icon: "🌫️", text: "안개가 꼈어요" };
  if (code <= 67) return { bg: "linear-gradient(160deg,#e8f0ff,#dce8ff,#eef4ff)", orb1: "#7ca8e060", orb2: "#5580c060", icon: "🌧️", text: "비가 오고 있어요", particle: "💧" };
  if (code <= 77) return { bg: "linear-gradient(160deg,#f0f4ff,#e8f0ff,#f8fbff)", orb1: "#c0d4f060", orb2: "#a0b8e060", icon: "❄️", text: "눈이 내리고 있어요", particle: "❄" };
  if (code <= 82) return { bg: "linear-gradient(160deg,#dce8ff,#ccd8f4,#e4ecff)", orb1: "#6090d060", orb2: "#4070b060", icon: "🌦️", text: "소나기가 내려요", particle: "💧" };
  return { bg: "linear-gradient(160deg,#e0e4f0,#d0d8ee,#e8ecf8)", orb1: "#9090c060", orb2: "#7070a060", icon: "⛈️", text: "천둥번개가 쳐요" };
}

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [dmUnread, setDmUnread] = useState(0);
  const [groupUnread, setGroupUnread] = useState(0);
  const [weather, setWeather] = useState<WeatherTheme | null>(null);
  const [particles, setParticles] = useState<{id:number;x:number;delay:number;duration:number}[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setNickname(snap.data().nickname || "유저");
        setProfileImage(snap.data().profileImage || null);
      }
    });
    return () => unsub();
  }, []);

  /* 날씨 */
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async ({ coords }) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true`
        );
        const data = await res.json();
        const theme = getWeatherTheme(data.current_weather?.weathercode ?? 0);
        setWeather(theme);
        if (theme.particle) {
          setParticles(Array.from({ length: 18 }, (_, i) => ({
            id: i, x: (i * 17) % 100,
            delay: (i * 0.4) % 4,
            duration: 2.5 + (i % 4) * 0.5,
          })));
        }
      } catch {}
    }, () => setWeather(getWeatherTheme(0)));
  }, []);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const fSnap = await getDocs(query(collection(db, "friends"), where("users", "array-contains", uid)));
      const list: Friend[] = [];
      for (const d of fSnap.docs) {
        const otherUid = d.data().users.find((u: string) => u !== uid);
        if (!otherUid) continue;
        const uSnap = await getDoc(doc(db, "users", otherUid));
        if (uSnap.exists()) list.push({ uid: otherUid, nickname: uSnap.data().nickname, profileImage: uSnap.data().profileImage || null });
      }
      setFriends(list);
    })();
  }, [uid]);

  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "messages"), where("to", "==", nickname));
    return onSnapshot(q, (snap) => {
      let n = 0;
      snap.forEach((d) => { const data = d.data(); if (data.from !== nickname && !data.readBy?.includes(nickname)) n++; });
      setDmUnread(n);
    });
  }, [nickname]);

  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "group_rooms"), where("members", "array-contains", nickname));
    return onSnapshot(q, async (snap) => {
      let total = 0;
      for (const d of snap.docs) {
        const msgSnap = await getDocs(collection(db, "group_rooms", d.id, "messages"));
        msgSnap.forEach((m) => { const data = m.data(); if (data.from !== nickname && !data.readBy?.includes(nickname)) total++; });
      }
      setGroupUnread(total);
    });
  }, [nickname]);

  const theme = weather ?? getWeatherTheme(0);

  const Badge = ({ count }: { count: number }) =>
    count > 0 ? (
      <div style={{
        position: "absolute", top: 10, right: 10,
        minWidth: 22, height: 22, borderRadius: 999,
        background: "linear-gradient(135deg,#ff4d6d,#ff8c42)",
        color: "#fff", fontSize: 11, fontWeight: 800,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 5px", zIndex: 2,
        boxShadow: "0 0 0 3px rgba(255,77,109,0.2)",
        animation: "pulse 1.8s ease-in-out infinite",
      }}>{count > 99 ? "99+" : count}</div>
    ) : null;

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, paddingBottom: 40, overflowX: "hidden", transition: "background 1s ease" }}>
      <HamburgerMenuWithDelete />

      {/* 날씨 파티클 */}
      {particles.map((p) => (
        <div key={p.id} style={{
          position: "fixed", left: `${p.x}%`, top: -20, zIndex: 0,
          fontSize: 14, opacity: 0.55, pointerEvents: "none",
          animation: `fall ${p.duration}s ${p.delay}s linear infinite`,
        }}>{theme.particle}</div>
      ))}

      {/* 배경 글로우 */}
      <div style={{ position: "fixed", top: -100, right: -100, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${theme.orb1}, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: 40, left: -80, width: 240, height: 240, borderRadius: "50%", background: `radial-gradient(circle, ${theme.orb2}, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* 인사 + 날씨 */}
        <div style={{ padding: "60px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 13, color: "#ffaa5e", fontWeight: 800, letterSpacing: 3, margin: 0 }}>WAGIE</p>
            <p style={{ fontSize: 30, fontWeight: 900, color: "#1a0e00", margin: "6px 0 0", lineHeight: 1.1 }}>
              안녕,{" "}
              <span style={{ background: "linear-gradient(90deg,#FF9A8B,#FFB347)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {nickname ?? "..."}
              </span>
            </p>
            <p style={{ fontSize: 13, color: "#a07060", margin: "8px 0 0", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 18 }}>{theme.icon}</span> {theme.text}
            </p>
          </div>
          <button onClick={() => router.push("/profile")} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", marginTop: 4 }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", overflow: "hidden", boxShadow: "0 4px 20px rgba(255,163,97,0.4)" }}>
              <TextAvatar nickname={nickname || "?"} size={50} profileImage={profileImage} />
            </div>
          </button>
        </div>

        {/* 친구 버블 */}
        {friends.length > 0 && (
          <div style={{ marginTop: 24, paddingLeft: 24 }}>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingRight: 24, paddingBottom: 2 }}>
              {friends.map((f) => (
                <button key={f.uid} onClick={() => router.push("/avatar")}
                  style={{ border: "none", background: "none", padding: 0, cursor: "pointer", flexShrink: 0, textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", boxShadow: "0 3px 12px rgba(0,0,0,0.12)", marginBottom: 5 }}>
                    <TextAvatar nickname={f.nickname} size={48} profileImage={f.profileImage} />
                  </div>
                  <p style={{ fontSize: 10, color: "#a07060", fontWeight: 600, margin: 0, maxWidth: 48, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nickname}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 벤토 그리드 */}
        <div style={{ padding: "24px 20px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* 1:1 채팅 — 큰 카드 */}
          <button onClick={() => router.push("/avatar")} style={{
            gridColumn: "1 / 3",
            background: "linear-gradient(135deg,#FF9A8B,#FFB347)",
            borderRadius: 28, padding: "22px 22px 18px",
            border: "none", cursor: "pointer", textAlign: "left",
            position: "relative", overflow: "hidden",
            boxShadow: "0 8px 32px rgba(255,154,139,0.35)",
          }}>
            <Badge count={dmUnread} />
            <div style={{ position: "absolute", right: -20, bottom: -20, fontSize: 90, opacity: 0.12, lineHeight: 1 }}>💬</div>
            <p style={{ fontSize: 36, margin: 0 }}>💬</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "10px 0 3px" }}>1:1 채팅</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: 0 }}>친구와 대화해요</p>
          </button>

          {/* 단체 채팅 */}
          <button onClick={() => router.push("/groupchat")} style={{
            background: "linear-gradient(135deg,#FFD580,#FFA63E)",
            borderRadius: 24, padding: "20px 18px 16px",
            border: "none", cursor: "pointer", textAlign: "left",
            position: "relative", overflow: "hidden",
            boxShadow: "0 6px 24px rgba(255,166,62,0.3)",
          }}>
            <Badge count={groupUnread} />
            <div style={{ position: "absolute", right: -12, bottom: -12, fontSize: 64, opacity: 0.12, lineHeight: 1 }}>👥</div>
            <p style={{ fontSize: 30, margin: 0 }}>👥</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: "8px 0 2px" }}>단체 채팅</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", margin: 0 }}>같이 얘기해요</p>
          </button>

          {/* 다이어리 */}
          <button onClick={() => router.push("/diary")} style={{
            background: "linear-gradient(135deg,#FFB6C1,#FF8FA3)",
            borderRadius: 24, padding: "20px 18px 16px",
            border: "none", cursor: "pointer", textAlign: "left",
            position: "relative", overflow: "hidden",
            boxShadow: "0 6px 24px rgba(255,143,163,0.3)",
          }}>
            <div style={{ position: "absolute", right: -12, bottom: -12, fontSize: 64, opacity: 0.12, lineHeight: 1 }}>📔</div>
            <p style={{ fontSize: 30, margin: 0 }}>📔</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: "8px 0 2px" }}>다이어리</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", margin: 0 }}>오늘을 기록해요</p>
          </button>

          {/* 친구 목록 */}
          <button onClick={() => router.push("/friendmenu")} style={{
            gridColumn: "1 / 3",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            borderRadius: 24, padding: "18px 22px",
            border: "none", cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", gap: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 16, flexShrink: 0,
              background: "linear-gradient(135deg,#FFECD2,#FCB69F)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            }}>🤝</div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#1a0e00", margin: 0 }}>친구 목록</p>
              <p style={{ fontSize: 12, color: "#b09080", margin: "2px 0 0" }}>친구를 관리해요</p>
            </div>
            <div style={{ marginLeft: "auto", color: "#ffb89a", fontSize: 20 }}>›</div>
          </button>

        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @keyframes fall  { 0%{transform:translateY(-20px) rotate(0deg);opacity:0.6} 100%{transform:translateY(110vh) rotate(360deg);opacity:0} }
      `}</style>
    </div>
  );
}
