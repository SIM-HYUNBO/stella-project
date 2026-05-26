"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where, onSnapshot } from "firebase/firestore";
import HamburgerMenuWithDelete from "@/components/hamburger";
import TextAvatar from "@/components/TextAvatar";

type Friend = { uid: string; nickname: string; profileImage: string | null };
type WCode = "sunny" | "cloudy" | "fog" | "rain" | "snow" | "shower" | "thunder";

function getWeatherType(code: number): WCode {
  if (code === 0) return "sunny";
  if (code <= 3)  return "cloudy";
  if (code <= 48) return "fog";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "shower";
  return "thunder";
}

const WEATHER_INFO: Record<WCode, { bg: string; icon: string; text: string; accent: string }> = {
  sunny:   { bg: "linear-gradient(160deg,#fff8e8,#fff0cc,#fffaf0)", icon: "☀️", text: "맑고 화창해요", accent: "#ffcc44" },
  cloudy:  { bg: "linear-gradient(160deg,#eef2f8,#e4eaf4,#f2f5fa)", icon: "⛅", text: "구름이 조금 있어요", accent: "#aabbcc" },
  fog:     { bg: "linear-gradient(160deg,#ebebeb,#e0e0e0,#f0f0f0)", icon: "🌫️", text: "안개가 꼈어요", accent: "#b0b8c0" },
  rain:    { bg: "linear-gradient(160deg,#d8e8f8,#ccdcf0,#e4eef8)", icon: "🌧️", text: "비가 오고 있어요", accent: "#6699cc" },
  snow:    { bg: "linear-gradient(160deg,#eef2ff,#e8eeff,#f5f7ff)", icon: "❄️", text: "눈이 내려요", accent: "#aabbee" },
  shower:  { bg: "linear-gradient(160deg,#ccdcf0,#bccce8,#d8e8f8)", icon: "🌦️", text: "소나기가 내려요", accent: "#5588bb" },
  thunder: { bg: "linear-gradient(160deg,#d0d4e8,#c4c8e0,#dcdfe8)", icon: "⛈️", text: "천둥번개가 쳐요", accent: "#8888cc" },
};

/* 비 */
function RainLayer() {
  const drops = Array.from({ length: 40 }, (_, i) => ({
    id: i, left: (i * 7.3) % 100,
    delay: (i * 0.11) % 1.2,
    dur: 0.6 + (i % 5) * 0.08,
    height: 14 + (i % 6) * 3,
    opacity: 0.25 + (i % 4) * 0.12,
  }));
  return (
    <>
      {drops.map(d => (
        <div key={d.id} style={{
          position: "fixed", left: `${d.left}%`, top: -20, zIndex: 0,
          width: 1.5, height: d.height, borderRadius: 4,
          background: "linear-gradient(to bottom, transparent, #6699cc)",
          opacity: d.opacity, pointerEvents: "none",
          animation: `rain ${d.dur}s ${d.delay}s linear infinite`,
        }} />
      ))}
    </>
  );
}

/* 눈 */
function SnowLayer() {
  const flakes = Array.from({ length: 30 }, (_, i) => ({
    id: i, left: (i * 11.3) % 100,
    delay: (i * 0.25) % 5,
    dur: 4 + (i % 5),
    size: 4 + (i % 5),
    opacity: 0.4 + (i % 3) * 0.15,
    drift: -12 + (i % 7) * 4,
  }));
  return (
    <>
      {flakes.map(f => (
        <div key={f.id} style={{
          position: "fixed", left: `${f.left}%`, top: -20, zIndex: 0,
          width: f.size, height: f.size, borderRadius: "50%",
          background: "rgba(200,220,255,0.9)",
          boxShadow: "0 0 4px rgba(180,200,255,0.8)",
          opacity: f.opacity, pointerEvents: "none",
          animation: `snow ${f.dur}s ${f.delay}s ease-in infinite`,
          "--drift": `${f.drift}px`,
        } as any} />
      ))}
    </>
  );
}

/* 햇살 */
function SunGlow() {
  return (
    <div style={{ position: "fixed", top: -60, right: -60, zIndex: 0, pointerEvents: "none" }}>
      <div style={{
        width: 200, height: 200, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,220,80,0.5) 0%, rgba(255,200,60,0.2) 40%, transparent 70%)",
        animation: "sunPulse 3s ease-in-out infinite",
      }} />
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} style={{
          position: "absolute", top: "50%", left: "50%",
          width: 2, height: 40 + (i % 3) * 15,
          background: "linear-gradient(to bottom, rgba(255,220,80,0.6), transparent)",
          transformOrigin: "top center",
          transform: `rotate(${i * 45}deg) translateX(-50%)`,
          animation: `sunRay 3s ${i * 0.4}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

/* 구름 */
function CloudLayer() {
  return (
    <>
      {[
        { top: 30, scale: 1.2, delay: 0, dur: 22, opacity: 0.25 },
        { top: 70, scale: 0.8, delay: 8, dur: 18, opacity: 0.18 },
        { top: 110, scale: 1.0, delay: 4, dur: 25, opacity: 0.20 },
      ].map((c, i) => (
        <div key={i} style={{
          position: "fixed", top: c.top, left: "-180px", zIndex: 0,
          pointerEvents: "none",
          animation: `cloudDrift ${c.dur}s ${c.delay}s linear infinite`,
          opacity: c.opacity,
          transform: `scale(${c.scale})`,
        }}>
          <div style={{ position: "relative", width: 160, height: 60 }}>
            <div style={{ position: "absolute", bottom: 0, left: 20, width: 120, height: 40, borderRadius: 40, background: "rgba(180,190,210,0.9)" }} />
            <div style={{ position: "absolute", bottom: 20, left: 30, width: 70, height: 50, borderRadius: 50, background: "rgba(190,200,220,0.9)" }} />
            <div style={{ position: "absolute", bottom: 15, left: 70, width: 55, height: 45, borderRadius: 50, background: "rgba(185,195,215,0.9)" }} />
          </div>
        </div>
      ))}
    </>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [dmUnread, setDmUnread] = useState(0);
  const [groupUnread, setGroupUnread] = useState(0);
  const [wcode, setWcode] = useState<WCode>("sunny");

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

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async ({ coords }) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true`);
        const data = await res.json();
        setWcode(getWeatherType(data.current_weather?.weathercode ?? 0));
      } catch {}
    }, () => {});
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

  const info = WEATHER_INFO[wcode];

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
    <div style={{ minHeight: "100vh", background: info.bg, paddingBottom: 40, overflowX: "hidden", transition: "background 1.5s ease" }}>
      <HamburgerMenuWithDelete />

      {/* 날씨 이펙트 */}
      {(wcode === "rain" || wcode === "shower") && <RainLayer />}
      {wcode === "snow" && <SnowLayer />}
      {wcode === "sunny" && <SunGlow />}
      {(wcode === "cloudy" || wcode === "fog" || wcode === "thunder") && <CloudLayer />}

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* 헤더 */}
        <div style={{ padding: "60px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 13, color: "#ffaa5e", fontWeight: 800, letterSpacing: 3, margin: 0 }}>WAGIE</p>
            <p style={{ fontSize: 30, fontWeight: 900, color: "#1a0e00", margin: "6px 0 0", lineHeight: 1.1 }}>
              안녕,{" "}
              <span style={{ background: "linear-gradient(90deg,#FF9A8B,#FFB347)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {nickname ?? "..."}
              </span>
            </p>
            <p style={{ fontSize: 13, color: "#806050", margin: "8px 0 0", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 20 }}>{info.icon}</span>{info.text}
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

          <button onClick={() => router.push("/friendmenu")} style={{
            gridColumn: "1 / 3",
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(12px)",
            borderRadius: 24, padding: "18px 22px",
            border: "none", cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", gap: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}>
            <div style={{ width: 46, height: 46, borderRadius: 16, flexShrink: 0, background: "linear-gradient(135deg,#FFECD2,#FCB69F)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🤝</div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#1a0e00", margin: 0 }}>친구 목록</p>
              <p style={{ fontSize: 12, color: "#b09080", margin: "2px 0 0" }}>친구를 관리해요</p>
            </div>
            <div style={{ marginLeft: "auto", color: "#ffb89a", fontSize: 20 }}>›</div>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse       { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @keyframes rain        { 0%{transform:translateY(-20px) skewX(-8deg);opacity:0} 100%{transform:translateY(110vh) skewX(-8deg);opacity:0.6} }
        @keyframes snow        { 0%{transform:translateY(-20px) translateX(0);opacity:0.8} 100%{transform:translateY(110vh) translateX(var(--drift));opacity:0} }
        @keyframes sunPulse    { 0%,100%{transform:scale(1);opacity:0.8} 50%{transform:scale(1.08);opacity:1} }
        @keyframes sunRay      { 0%,100%{opacity:0.4;height:40px} 50%{opacity:0.8;height:60px} }
        @keyframes cloudDrift  { 0%{transform:translateX(-200px) scale(var(--s,1))} 100%{transform:translateX(110vw) scale(var(--s,1))} }
      `}</style>
    </div>
  );
}
