"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../firebase";
import { doc, getDoc, getDocs, collection, query, where, onSnapshot, addDoc, updateDoc, orderBy, serverTimestamp } from "firebase/firestore";

type Line = { id: string; by: string; text: string; createdAt: any };

export default function StorySessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [nickname, setNickname] = useState<string | null>(null);
  const [partner, setPartner] = useState<string | null>(null);
  const [requestDocId, setRequestDocId] = useState<string | null>(null);
  const [fromUser, setFromUser] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setNickname(snap.data().nickname || "유저");
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!nickname || !sessionId) return;
    (async () => {
      const snap = await getDocs(query(collection(db, "story_requests"), where("sessionId", "==", sessionId)));
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setPartner(data.from === nickname ? data.to : data.from);
        setFromUser(data.from);
        setRequestDocId(snap.docs[0].id);
      }
    })();
  }, [nickname, sessionId]);

  useEffect(() => {
    if (!sessionId || !nickname) return;
    const q = query(collection(db, "story_sessions", sessionId, "lines"), orderBy("createdAt", "asc"));
    return onSnapshot(q,
      (snap) => {
        setLines(snap.docs.map(d => ({ id: d.id, ...d.data() } as Line)));
      },
      (err) => console.error("story lines error:", err)
    );
  }, [sessionId, nickname]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  // 내 차례인지 계산: 처음엔 from 차례, 이후 번갈아가며
  const isMyTurn = (() => {
    if (!nickname || !fromUser) return false;
    if (lines.length === 0) return nickname === fromUser;
    const last = lines[lines.length - 1];
    return last.by !== nickname;
  })();

  const sendLine = async () => {
    if (!input.trim() || !nickname || !isMyTurn || sending) return;
    setSending(true);
    await addDoc(collection(db, "story_sessions", sessionId, "lines"), {
      by: nickname, text: input.trim(), createdAt: serverTimestamp(),
    });
    setInput("");
    setSending(false);
  };

  const handleSave = () => {
    const text = lines.map((l, i) => `[${i + 1}] ${l.by}: ${l.text}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "wagie-story.txt";
    link.click();
  };

  const handleShare = async () => {
    const text = lines.map(l => l.text).join(" ");
    if (navigator.share) {
      await navigator.share({ title: "WAGIE 스토리 ✍️", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#1a1a2e" }}>

      {/* 상단 바 */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: "#16213e" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowExit(true)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-lg active:scale-90 transition-transform">‹</button>
          <div>
            <p className="text-white font-black text-sm">스토리 이어쓰기</p>
            {partner && <p className="text-white/50 text-[10px]">with {partner}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95 transition" style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>저장</button>
          <button onClick={handleShare} className="px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95 transition bg-white/15">공유</button>
        </div>
      </div>

      {/* 스토리 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {lines.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
            <p className="text-4xl">✍️</p>
            <p className="text-white/60 text-sm">첫 문장을 써봐요!</p>
          </div>
        )}
        {lines.map((line, i) => {
          const isMine = line.by === nickname;
          return (
            <div key={line.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              <p className="text-white/40 text-[10px] mb-1 px-1">{line.by} · {i + 1}번째</p>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed font-medium ${isMine ? "text-white rounded-br-md" : "bg-white/10 text-white/90 rounded-bl-md"}`}
                style={isMine ? { background: "linear-gradient(135deg, #a855f7, #ec4899)" } : {}}>
                {line.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="shrink-0 px-4 py-3" style={{ background: "#16213e" }}>
        {!isMyTurn && lines.length > 0 && (
          <p className="text-center text-white/40 text-xs mb-2">{partner}의 차례예요 ⏳</p>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendLine(); } }}
            placeholder={isMyTurn ? "다음 문장을 이어써요..." : `${partner}의 차례예요`}
            disabled={!isMyTurn || sending}
            rows={2}
            className="flex-1 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none resize-none bg-white/10 disabled:opacity-40"
          />
          <button onClick={sendLine} disabled={!isMyTurn || !input.trim() || sending}
            className="w-12 rounded-2xl flex items-center justify-center text-xl active:scale-95 transition disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>
            ↑
          </button>
        </div>
      </div>

      {/* 나가기 확인 */}
      {showExit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="w-full max-w-xs rounded-[24px] p-6 flex flex-col gap-4" style={{ background: "#16213e", border: "1px solid rgba(168,85,247,0.3)" }}>
            <div className="text-center">
              <p className="text-2xl mb-2">🚪</p>
              <p className="text-white font-black text-lg">나가기</p>
              <p className="text-white/50 text-sm mt-1">스토리는 저장되지 않아요.<br/>정말 나갈까요?</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowExit(false)} className="flex-1 py-3 rounded-2xl bg-white/10 text-white/70 font-bold text-sm active:scale-95 transition">취소</button>
              <button onClick={async () => {
                if (requestDocId) await updateDoc(doc(db, "story_requests", requestDocId), { status: "ended" });
                router.push("/creative");
              }} className="flex-1 py-3 rounded-2xl font-bold text-sm text-white active:scale-95 transition"
                style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>
                나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
