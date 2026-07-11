"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/app/firebase";

type Pet = {
  hunger: number;
  happiness: number;
  energy: number;
  level: number;
  exp: number;
  lastSaved: number;
};

const DEFAULT: Pet = { hunger: 80, happiness: 80, energy: 80, level: 1, exp: 0, lastSaved: Date.now() };
const DECAY = { hunger: 0.15, happiness: 0.12, energy: 0.08 }; // per minute
const EXP_NEED = [0, 0, 60, 160, 320, 550];
const LEVEL_NAME = ["", "아기 춘식", "꼬마 춘식", "어른 춘식", "통통 춘식", "왕 춘식 👑"];

function decay(pet: Pet): Pet {
  const mins = Math.min((Date.now() - pet.lastSaved) / 60000, 480);
  return {
    ...pet,
    hunger: Math.max(0, pet.hunger - DECAY.hunger * mins),
    happiness: Math.max(0, pet.happiness - DECAY.happiness * mins),
    energy: Math.max(0, pet.energy - DECAY.energy * mins),
    lastSaved: Date.now(),
  };
}

function getMood(p: Pet) {
  const m = Math.min(p.hunger, p.happiness, p.energy);
  if (m < 8) return { emoji: "😵", color: "#ef4444", label: "위험해!" };
  if (p.energy < 22) return { emoji: "😴", color: "#8b5cf6", label: "졸려..." };
  if (p.hunger < 22) return { emoji: "😿", color: "#f97316", label: "배고파ㅠ" };
  if (p.happiness < 22) return { emoji: "😾", color: "#6b7280", label: "심심해..." };
  if (p.happiness > 80 && p.hunger > 75) return { emoji: "😻", color: "#ec4899", label: "최고야!" };
  return { emoji: "😸", color: "#22c55e", label: "좋아~" };
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#888" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color }}>{Math.round(value)}</span>
      </div>
      <div style={{ height: 10, borderRadius: 99, background: "#f0f0f0", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99,
          width: `${value}%`,
          background: color,
          transition: "width 0.5s ease",
          boxShadow: `0 0 8px ${color}80`,
        }} />
      </div>
    </div>
  );
}

export default function ChunPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [msg, setMsg] = useState("");
  const [floats, setFloats] = useState<{ id: number; emoji: string }[]>([]);
  const [levelUp, setLevelUp] = useState(false);
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floatId = useRef(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.replace("/login"); return; }
      setUid(u.uid);
      const snap = await getDoc(doc(db, "chunsik", u.uid));
      const data = snap.exists() ? (snap.data() as Pet) : { ...DEFAULT, lastSaved: Date.now() };
      setPet(decay(data));
    });
    return () => unsub();
  }, [router]);

  const save = useCallback((p: Pet, id: string) => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      setDoc(doc(db, "chunsik", id), p);
    }, 2000);
  }, []);

  const addFloat = (emoji: string) => {
    const id = floatId.current++;
    setFloats(prev => [...prev, { id, emoji }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1200);
  };

  const doAction = (type: "feed" | "play" | "sleep") => {
    if (!pet || !uid) return;
    setPet(prev => {
      if (!prev) return prev;
      let next = { ...prev };
      if (type === "feed") {
        next.hunger = Math.min(100, prev.hunger + 28);
        next.exp += 5;
        setMsg("냠냠! 맛있어~ 🍚");
        addFloat("🍚");
      } else if (type === "play") {
        next.happiness = Math.min(100, prev.happiness + 25);
        next.energy = Math.max(0, prev.energy - 12);
        next.exp += 8;
        setMsg("키얏! 신나! 🎾");
        addFloat("🎾");
      } else {
        next.energy = Math.min(100, prev.energy + 38);
        next.exp += 3;
        setMsg("쿨쿨... 💤");
        addFloat("💤");
      }
      // 레벨업 체크
      const maxLv = EXP_NEED.length - 1;
      if (next.level < maxLv && next.exp >= EXP_NEED[next.level + 1]) {
        next.level = next.level + 1;
        next.exp = 0;
        setLevelUp(true);
        setTimeout(() => setLevelUp(false), 2500);
      }
      save(next, uid);
      return next;
    });
  };

  if (!pet) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, #fffbeb, #fef3c7)" }}>
      <img src="/wag.png" alt="loading" style={{ width: 56, height: 56, animation: "bounce 0.9s infinite" }} />
    </div>
  );

  const mood = getMood(pet);
  const expPct = pet.level >= EXP_NEED.length - 1 ? 100 : (pet.exp / EXP_NEED[pet.level + 1]) * 100;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(160deg, #fffbeb 0%, #fef9c3 50%, #fef3c7 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "0 20px 40px", userSelect: "none", position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes wiggle { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-8deg)} 75%{transform:rotate(8deg)} }
        @keyframes floatUp { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-80px) scale(1.4)} }
        @keyframes levelPop { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        @keyframes heartbeat { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
      `}</style>

      {/* 배경 블롭 */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -40, left: -40, width: 200, height: 200, borderRadius: "50%", background: "#fde68a", filter: "blur(60px)", opacity: 0.5 }} />
        <div style={{ position: "absolute", bottom: 0, right: -20, width: 160, height: 160, borderRadius: "50%", background: "#fca5a5", filter: "blur(50px)", opacity: 0.3 }} />
      </div>

      {/* 뒤로가기 */}
      <button onClick={() => router.back()} style={{
        position: "absolute", top: 20, left: 20, zIndex: 10,
        width: 40, height: 40, borderRadius: 13,
        background: "rgba(255,255,255,0.8)", border: "1.5px solid rgba(0,0,0,0.07)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontSize: 18, color: "#636e72",
      }}>←</button>

      {/* 타이틀 */}
      <p style={{ fontSize: 11, fontWeight: 800, color: "#d97706", letterSpacing: "0.2em", marginTop: 64, marginBottom: 4, textTransform: "uppercase", position: "relative", zIndex: 1 }}>
        CHUNSIK PET
      </p>

      {/* 레벨 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, position: "relative", zIndex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: "#92400e" }}>Lv.{pet.level} {LEVEL_NAME[pet.level]}</span>
      </div>

      {/* 캐릭터 */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: 16 }}>
        <div style={{
          width: 160, height: 160, borderRadius: "50%",
          background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)",
          border: "3px solid rgba(255,255,255,0.9)",
          boxShadow: `0 12px 40px ${mood.color}30, 0 4px 12px rgba(0,0,0,0.06)`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          animation: mood.emoji === "😸" || mood.emoji === "😻" ? "heartbeat 2s infinite" : "none",
        }}>
          <span style={{ fontSize: 72, lineHeight: 1, animation: msg ? "wiggle 0.4s ease" : "none" }}>{mood.emoji}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: mood.color, marginTop: 4 }}>{mood.label}</span>
        </div>

        {/* 플로팅 이모지 */}
        {floats.map(f => (
          <div key={f.id} style={{
            position: "absolute", top: "20%", left: "50%",
            fontSize: 28, pointerEvents: "none",
            animation: "floatUp 1.2s ease forwards",
          }}>{f.emoji}</div>
        ))}
      </div>

      {/* 레벨업 */}
      {levelUp && (
        <div style={{
          position: "fixed", top: "30%", left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
          borderRadius: 20, padding: "14px 28px", zIndex: 100,
          animation: "levelPop 0.5s ease",
          boxShadow: "0 8px 32px rgba(251,191,36,0.5)",
        }}>
          <p style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: 0 }}>🎉 레벨 업!</p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", margin: "4px 0 0", textAlign: "center" }}>{LEVEL_NAME[pet.level]}</p>
        </div>
      )}

      {/* 말풍선 */}
      {msg && (
        <div style={{
          background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(255,255,255,0.95)",
          borderRadius: 16, padding: "8px 16px", marginBottom: 16,
          fontSize: 13, fontWeight: 700, color: "#374151",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)", position: "relative", zIndex: 1,
        }}>
          {msg}
        </div>
      )}

      {/* 스탯 */}
      <div style={{
        width: "100%", maxWidth: 320, position: "relative", zIndex: 1,
        background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)",
        borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.9)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
        padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 12, marginBottom: 16,
      }}>
        <StatBar label="🍚 배고픔" value={pet.hunger} color="#f97316" />
        <StatBar label="😊 행복" value={pet.happiness} color="#ec4899" />
        <StatBar label="💤 에너지" value={pet.energy} color="#6366f1" />
        <div style={{ paddingTop: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#888" }}>✨ 경험치</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#d97706" }}>{pet.level >= EXP_NEED.length - 1 ? "MAX" : `${Math.round(expPct)}%`}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: "#f0f0f0", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${expPct}%`, borderRadius: 99, background: "linear-gradient(90deg, #fbbf24, #f59e0b)", transition: "width 0.5s" }} />
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: "flex", gap: 12, position: "relative", zIndex: 1, width: "100%", maxWidth: 320 }}>
        {([
          { type: "feed" as const, emoji: "🍚", label: "밥 주기", color: "#f97316", glow: "rgba(249,115,22,0.3)" },
          { type: "play" as const, emoji: "🎾", label: "놀아주기", color: "#ec4899", glow: "rgba(236,72,153,0.3)" },
          { type: "sleep" as const, emoji: "💤", label: "재우기", color: "#6366f1", glow: "rgba(99,102,241,0.3)" },
        ] as const).map(({ type, emoji, label, color, glow }) => (
          <button key={type} onClick={() => doAction(type)} style={{
            flex: 1, padding: "14px 0",
            background: "rgba(255,255,255,0.82)", backdropFilter: "blur(20px)",
            border: "1.5px solid rgba(255,255,255,0.95)",
            borderRadius: 20,
            boxShadow: `0 6px 20px ${glow}, inset 0 1px 0 rgba(255,255,255,0.9)`,
            cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 4,
            transition: "transform 0.1s",
          }}
            onMouseDown={e => (e.currentTarget.style.transform = "scale(0.94)")}
            onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
            onTouchStart={e => (e.currentTarget.style.transform = "scale(0.94)")}
            onTouchEnd={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span style={{ fontSize: 28 }}>{emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
