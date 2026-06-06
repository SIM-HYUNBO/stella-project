"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection, addDoc, doc, setDoc, getDoc,
  onSnapshot, orderBy, query, serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/app/firebase";

export default function AIChatPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [memory, setMemory] = useState<any>(null);
  const [isVip, setIsVip] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/login"); return; }
      setUid(user.uid);
      setSessionId(`ai-room-${user.uid}`);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const loadVip = async () => {
      if (!uid) return;
      const snap = await getDoc(doc(db, "users", uid));
      setIsVip(snap.exists() ? snap.data().isVip === true : false);
    };
    loadVip();
  }, [uid]);

  useEffect(() => {
    if (!sessionId) return;
    const q = query(collection(db, "chat_sessions", sessionId, "messages"), orderBy("createdAt"));
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [sessionId]);

  useEffect(() => {
    const loadMemory = async () => {
      if (!sessionId) return;
      const snap = await getDoc(doc(db, "chat_sessions", sessionId));
      if (snap.exists()) setMemory(snap.data().memory || null);
    };
    loadMemory();
  }, [sessionId]);

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;
    const userMsg = { role: "user", content: input, createdAt: serverTimestamp() };
    setInput("");
    await addDoc(collection(db, "chat_sessions", sessionId, "messages"), userMsg);
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })), memory, uid }),
    });
    const data = await res.json();
    const aiMsg = { role: "assistant", content: data.reply || "응답 실패", createdAt: serverTimestamp() };
    await addDoc(collection(db, "chat_sessions", sessionId, "messages"), aiMsg);
    if (isVip) {
      const memRes = await fetch("/api/ai-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg, aiMsg] }),
      });
      const mem = await memRes.json();
      await setDoc(doc(db, "chat_sessions", sessionId), { memory: mem, uid }, { merge: true });
      setMemory(mem);
    }
  };

  return (
    <main className="relative h-screen overflow-hidden flex flex-col">
      <div className="fixed inset-0 bg-gray-50" />

      {/* 헤더 */}
      <div className="relative z-10 flex items-center justify-between h-14 px-4 bg-white border-b-2 border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-50 text-sky-500 font-bold text-lg">←</button>
          <span className="font-black text-[gray-800] text-sm">🧠 AI Chat</span>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-black shadow-sm ${isVip ? "bg-sky-400 text-white" : "bg-sky-50 text-[sky-500]"}`}>
          {isVip ? "💎 VIP" : "FREE"}
        </div>
      </div>

      {/* 메시지 */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {memory && isVip && (
          <div className="rounded-[16px] bg-sky-500 border border-amber-100 px-4 py-3 text-xs text-amber-700 font-semibold">
            💎 {memory.summary} · {memory.personality}
          </div>
        )}
        {messages.map((m: any, i: number) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-sm shrink-0 shadow-sm">🤖</div>
            )}
            <div className={`px-4 py-2.5 rounded-[18px] max-w-[72%] text-sm leading-relaxed shadow-sm ${
              m.role === "user"
                ? "bg-sky-500 text-white rounded-br-[6px]"
                : "bg-white border-2 border-gray-700 text-[gray-800] rounded-bl-[6px]"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {/* 입력 */}
      <div className="relative z-10 flex items-center gap-2 px-4 py-3 bg-white border-t-2 border-gray-700 shrink-0">
        <input
          className="flex-1 bg-gray-50 border-2 border-gray-700 rounded-[16px] px-4 py-2.5 text-sm text-[gray-800] placeholder:text-[sky-400] outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="메시지 입력"
        />
        <button onClick={sendMessage}
          className="w-11 h-11 rounded-[14px] bg-sky-500 text-white font-black shadow-[0_4px_14px_rgba(14,165,233,0.35)] active:scale-95 transition-transform flex items-center justify-center">
          ▶
        </button>
      </div>
    </main>
  );
}
