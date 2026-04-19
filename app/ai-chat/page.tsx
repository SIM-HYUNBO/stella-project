"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/app/firebase";

export default function AIChatPage() {
  const [sessionId, setSessionId] = useState("test-room");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [memory, setMemory] = useState<any>(null);
  const [isVip, setIsVip] = useState(false);

  /* VIP 상태 */
  useEffect(() => {
    setIsVip(localStorage.getItem("vip") === "true");
  }, []);

  /* 메시지 구독 */
  useEffect(() => {
    if (!sessionId) return;

    const q = query(
      collection(db, "chat_sessions", sessionId, "messages"),
      orderBy("createdAt")
    );

    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => d.data()));
    });
  }, [sessionId]);

  /* memory 로딩 */
  useEffect(() => {
    const load = async () => {
      if (!sessionId) return;

      const snap = await getDoc(
        doc(db, "chat_sessions", sessionId)
      );

      if (snap.exists()) {
        setMemory(snap.data().memory);
      }
    };

    load();
  }, [sessionId]);

  /* 전송 */
  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    const userMsg = {
      role: "user",
      content: input,
      createdAt: serverTimestamp(),
    };

    setInput("");

    await addDoc(
      collection(db, "chat_sessions", sessionId, "messages"),
      userMsg
    );

    const latestMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: latestMessages,
        memory,
      }),
    });

    const data = await res.json();

    const aiMsg = {
      role: "assistant",
      content: data.reply || "응답 실패",
      createdAt: serverTimestamp(),
    };

    await addDoc(
      collection(db, "chat_sessions", sessionId, "messages"),
      aiMsg
    );

    /* VIP MEMORY 업데이트 */
    if (isVip) {
      const memRes = await fetch("/api/ai-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg, aiMsg],
        }),
      });

      const mem = await memRes.json();

      await setDoc(
        doc(db, "chat_sessions", sessionId),
        { memory: mem },
        { merge: true }
      );

      setMemory(mem);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">

      {/* 상단 정보 */}
      <div className="p-3 border-b text-sm flex justify-between">
        <div>🧠 AI Chat</div>
        <div className={isVip ? "text-yellow-500" : ""}>
          {isVip ? "VIP MODE" : "FREE MODE"}
        </div>
      </div>

      {/* 메시지 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {memory && isVip && (
          <div className="bg-yellow-50 border p-2 rounded text-xs">
            🧠 {memory.summary} / {memory.personality}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.role === "user"
                ? "justify-end"
                : "justify-start"
            }`}
          >
            {m.role === "user" ? (
              <div className="bg-blue-500 text-white px-4 py-2 rounded-2xl max-w-xs">
                {m.content}
              </div>
            ) : (
              <div className="bg-white border px-4 py-2 rounded-2xl max-w-xs">
                {m.content}
              </div>
            )}
          </div>
        ))}

      </div>

      {/* 입력 */}
      <div className="border-t p-3 flex gap-2 bg-white">

        <input
          className="flex-1 border px-3 py-2 rounded-xl"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="메시지 입력"
        />

        <button
          onClick={sendMessage}
          className="bg-black text-white px-4 rounded-xl"
        >
          전송
        </button>

      </div>

    </div>
  );
}