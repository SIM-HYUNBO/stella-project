"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, orderBy, onSnapshot, limit,
  addDoc, deleteDoc, doc, getDoc, serverTimestamp,
} from "firebase/firestore";

type Mission = {
  id: string; title: string; description: string;
  emoji: string; startAt: number; endAt: number; createdBy: string;
};

type ChatMsg = {
  id: string; from: string; content: string;
  createdAt: any; profileImage?: string;
};

function formatLeft(endAt: number) {
  const diff = endAt - Date.now();
  if (diff <= 0) return "종료됨";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}일 ${h}시간 남음`;
  if (h > 0) return `${h}시간 ${m}분 남음`;
  return `${m}분 남음`;
}

function MissionCard({ m, isStella, onDelete }: { m: Mission; isStella: boolean; onDelete: () => void }) {
  const now = Date.now();
  const started = now >= m.startAt;
  const ended = now > m.endAt;
  const progress = ended ? 100 : !started ? 0 : Math.min(100, ((now - m.startAt) / (m.endAt - m.startAt)) * 100);
  return (
    <div style={{
      borderRadius: 24,
      background: ended ? "rgba(255,255,255,0.04)" : "rgba(139,92,246,0.10)",
      border: `1.5px solid ${ended ? "rgba(255,255,255,0.06)" : "rgba(167,139,250,0.25)"}`,
      padding: "20px 20px 16px", position: "relative", overflow: "hidden",
    }}>
      {!ended && <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(139,92,246,0.15)", filter: "blur(30px)", pointerEvents: "none" }} />}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 32, lineHeight: 1, filter: ended ? "grayscale(1) opacity(0.4)" : "none" }}>{m.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: ended ? "#555" : "#e9d5ff" }}>{m.title}</span>
            {ended && <span style={{ fontSize: 10, fontWeight: 800, color: "#555", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 99 }}>종료</span>}
            {!ended && started && <span style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", background: "rgba(139,92,246,0.2)", padding: "2px 8px", borderRadius: 99 }}>진행 중</span>}
            {!started && <span style={{ fontSize: 10, fontWeight: 800, color: "#6b7280", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 99 }}>예정</span>}
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, lineHeight: 1.5 }}>{m.description}</p>
        </div>
        {isStella && <button onClick={onDelete} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(239,68,68,0.15)", color: "#f87171", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>✕</button>}
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 8 }}>
        <div style={{ height: "100%", borderRadius: 99, width: `${progress}%`, background: ended ? "#374151" : "linear-gradient(90deg, #7c3aed, #a855f7)", transition: "width 0.5s", boxShadow: ended ? "none" : "0 0 8px rgba(168,85,247,0.6)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "#6b7280" }}>
          {new Date(m.startAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} ~ {new Date(m.endAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
        </span>
        <span style={{ fontSize: 11, fontWeight: 800, color: ended ? "#555" : "#a78bfa" }}>{ended ? "종료됨" : formatLeft(m.endAt)}</span>
      </div>
    </div>
  );
}

export default function WagiPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isWagi, setIsWagi] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"missions" | "chat">("missions");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", emoji: "⭐", startAt: "", endAt: "" });
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isStella = nickname === "Stella";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.replace("/login"); return; }
      const snap = await getDoc(doc(db, "users", u.uid));
      if (!snap.exists() || snap.data().isWagi !== true) { router.replace("/home"); return; }
      setNickname(snap.data().nickname ?? "");
      setProfileImage(snap.data().profileImage ?? null);
      setIsWagi(true);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!isWagi) return;
    const q = query(collection(db, "wagi_missions"), orderBy("startAt", "desc"));
    return onSnapshot(q, (snap) => {
      setMissions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Mission)));
    });
  }, [isWagi]);

  useEffect(() => {
    if (!isWagi) return;
    const q = query(collection(db, "wagi_chat"), orderBy("createdAt", "asc"), limit(100));
    return onSnapshot(q, (snap) => {
      setMsgs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMsg)));
    });
  }, [isWagi]);

  useEffect(() => {
    if (tab === "chat") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, tab]);

  const sendChat = async () => {
    if (!chatInput.trim() || sending) return;
    const text = chatInput.trim();
    setChatInput("");
    setSending(true);
    await addDoc(collection(db, "wagi_chat"), {
      from: nickname, content: text, createdAt: serverTimestamp(),
      ...(profileImage ? { profileImage } : {}),
    });
    setSending(false);
    inputRef.current?.focus();
  };

  const addMission = async () => {
    if (!form.title.trim() || !form.startAt || !form.endAt) return;
    setSaving(true);
    await addDoc(collection(db, "wagi_missions"), {
      title: form.title.trim(), description: form.description.trim(),
      emoji: form.emoji || "⭐",
      startAt: new Date(form.startAt).getTime(), endAt: new Date(form.endAt).getTime(),
      createdBy: nickname, createdAt: serverTimestamp(),
    });
    setForm({ title: "", description: "", emoji: "⭐", startAt: "", endAt: "" });
    setShowAdd(false);
    setSaving(false);
  };

  if (isWagi === null) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#04000f" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #7c3aed", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(160deg, #04000f 0%, #0d0020 50%, #04000f 100%)", color: "#e9d5ff", display: "flex", flexDirection: "column" }}>
      {/* 배경 블롭 */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -60, left: -60, width: 300, height: 300, borderRadius: "50%", background: "#4c1d95", filter: "blur(80px)", opacity: 0.25 }} />
        <div style={{ position: "absolute", bottom: 0, right: -40, width: 200, height: 200, borderRadius: "50%", background: "#6d28d9", filter: "blur(60px)", opacity: 0.2 }} />
      </div>

      {/* 헤더 */}
      <div style={{ position: "relative", zIndex: 1, padding: "56px 20px 0", textAlign: "center", flexShrink: 0 }}>
        <button onClick={() => router.back()} style={{
          position: "absolute", top: 16, left: 16, width: 36, height: 36, borderRadius: 11,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          color: "#a78bfa", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>←</button>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.3em", color: "#7c3aed", marginBottom: 6 }}>SECRET ROOM</p>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "#e9d5ff" }}>⚜️ 와기의 비밀방</h1>

        {/* 탭 */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20, marginBottom: 0 }}>
          {(["missions", "chat"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 24px", borderRadius: 99, fontWeight: 800, fontSize: 13,
              border: tab === t ? "none" : "1.5px solid rgba(139,92,246,0.2)",
              background: tab === t ? "linear-gradient(135deg, #6d28d9, #9333ea)" : "transparent",
              color: tab === t ? "#f3e8ff" : "#6b7280",
              cursor: "pointer", transition: "all 0.2s",
              boxShadow: tab === t ? "0 4px 16px rgba(109,40,217,0.4)" : "none",
            }}>
              {t === "missions" ? "✨ 미션" : "💬 채팅"}
            </button>
          ))}
        </div>
      </div>

      {/* 미션 탭 */}
      {tab === "missions" && (
        <div style={{ position: "relative", zIndex: 1, padding: "20px 16px 90px", maxWidth: 480, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#a78bfa" }}>진행 중인 미션</span>
            {isStella && (
              <button onClick={() => setShowAdd(true)} style={{
                padding: "6px 14px", borderRadius: 12, background: "linear-gradient(135deg, #6d28d9, #9333ea)",
                color: "#f3e8ff", fontWeight: 900, fontSize: 12, border: "none", cursor: "pointer",
              }}>+ 미션 추가</button>
            )}
          </div>
          {missions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#4b5563" }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>🔮</p>
              <p style={{ fontWeight: 700, fontSize: 14 }}>아직 미션이 없어요</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {missions.map((m) => (
                <MissionCard key={m.id} m={m} isStella={isStella} onDelete={() => deleteDoc(doc(db, "wagi_missions", m.id))} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 채팅 탭 */}
      {tab === "chat" && (
        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", width: "100%", minHeight: 0 }}>
          {/* 메시지 목록 */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
            {msgs.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#4b5563" }}>
                <p style={{ fontSize: 36, marginBottom: 10 }}>💬</p>
                <p style={{ fontWeight: 700, fontSize: 14 }}>첫 메시지를 남겨봐요!</p>
              </div>
            )}
            {msgs.map((m) => {
              const isMe = m.from === nickname;
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: 8 }}>
                  {/* 아바타 */}
                  {!isMe && (
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #6d28d9, #9333ea)", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                      {m.profileImage
                        ? <img src={m.profileImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : m.from?.[0]}
                    </div>
                  )}
                  <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 3, alignItems: isMe ? "flex-end" : "flex-start" }}>
                    {!isMe && <span style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", paddingLeft: 4 }}>{m.from}</span>}
                    <div style={{
                      padding: "10px 14px", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: isMe
                        ? "linear-gradient(135deg, #6d28d9, #9333ea)"
                        : "rgba(139,92,246,0.12)",
                      border: isMe ? "none" : "1px solid rgba(139,92,246,0.2)",
                      color: isMe ? "#f3e8ff" : "#d8b4fe",
                      fontSize: 14, lineHeight: 1.45, wordBreak: "break-word",
                      boxShadow: isMe ? "0 4px 16px rgba(109,40,217,0.35)" : "none",
                    }}>
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div style={{
            padding: "10px 12px 80px", flexShrink: 0,
            borderTop: "1px solid rgba(139,92,246,0.15)",
            background: "rgba(4,0,15,0.8)", backdropFilter: "blur(20px)",
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center",
              background: "rgba(139,92,246,0.1)", border: "1.5px solid rgba(139,92,246,0.25)",
              borderRadius: 99, padding: "8px 8px 8px 16px",
            }}>
              <input
                ref={inputRef}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder="비밀방 채팅..."
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e9d5ff", fontSize: 14, minWidth: 0 }}
              />
              <button onClick={sendChat} disabled={!chatInput.trim() || sending} style={{
                width: 36, height: 36, borderRadius: "50%", border: "none",
                background: chatInput.trim() ? "linear-gradient(135deg, #6d28d9, #9333ea)" : "rgba(255,255,255,0.06)",
                color: chatInput.trim() ? "#f3e8ff" : "#4b5563",
                fontSize: 16, cursor: chatInput.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s", flexShrink: 0,
              }}>➤</button>
            </div>
          </div>
        </div>
      )}

      {/* 미션 추가 모달 */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
          onClick={() => setShowAdd(false)}>
          <div style={{ width: "100%", maxWidth: 480, background: "#0d0020", border: "1.5px solid rgba(139,92,246,0.3)", borderRadius: "28px 28px 0 0", padding: "28px 20px 40px", display: "flex", flexDirection: "column", gap: 14 }}
            onClick={(e) => e.stopPropagation()}>
            <p style={{ fontWeight: 900, fontSize: 17, color: "#e9d5ff", margin: 0 }}>✨ 미션 추가</p>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={form.emoji} onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))}
                style={{ width: 52, textAlign: "center", fontSize: 24, background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(139,92,246,0.3)", borderRadius: 14, color: "#e9d5ff", outline: "none" }} />
              <input placeholder="미션 제목" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(139,92,246,0.3)", borderRadius: 14, color: "#e9d5ff", fontSize: 14, outline: "none" }} />
            </div>
            <textarea placeholder="미션 설명" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(139,92,246,0.3)", borderRadius: 14, color: "#e9d5ff", fontSize: 13, outline: "none", resize: "none", fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: "#7c3aed", fontWeight: 800, margin: "0 0 4px" }}>시작일</p>
                <input type="datetime-local" value={form.startAt} onChange={e => setForm(p => ({ ...p, startAt: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(139,92,246,0.3)", borderRadius: 12, color: "#e9d5ff", fontSize: 12, outline: "none" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: "#7c3aed", fontWeight: 800, margin: "0 0 4px" }}>종료일</p>
                <input type="datetime-local" value={form.endAt} onChange={e => setForm(p => ({ ...p, endAt: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(139,92,246,0.3)", borderRadius: 12, color: "#e9d5ff", fontSize: 12, outline: "none" }} />
              </div>
            </div>
            <button onClick={addMission} disabled={saving || !form.title.trim() || !form.startAt || !form.endAt}
              style={{ height: 50, borderRadius: 18, background: "linear-gradient(135deg, #6d28d9, #9333ea)", color: "#f3e8ff", fontWeight: 900, fontSize: 15, border: "none", cursor: saving ? "default" : "pointer", opacity: saving || !form.title.trim() ? 0.5 : 1, boxShadow: "0 4px 20px rgba(109,40,217,0.4)" }}>
              {saving ? "저장 중..." : "미션 등록"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
