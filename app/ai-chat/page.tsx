"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

  /* =========================
   * 1. 로그인 상태 확인 (Email/Auth 기반)
   * ========================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUid(user.uid);
      setSessionId(`ai-room-${user.uid}`);
    });

    return () => unsub();
  }, []);

  /* =========================
   * 🔥 2. VIP 상태 (Firestore 기준으로 변경)
   * ========================= */
  useEffect(() => {
    const loadVip = async () => {
      if (!uid) return;

      const snap = await getDoc(doc(db, "users", uid));

      if (snap.exists()) {
        setIsVip(snap.data().isVip === true);
      } else {
        setIsVip(false);
      }
    };

    loadVip();
  }, [uid]);

  /* =========================
   * 3. 메시지 실시간 구독
   * ========================= */
  useEffect(() => {
    if (!sessionId) return;

    const q = query(
      collection(db, "chat_sessions", sessionId, "messages"),
      orderBy("createdAt")
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });

    return () => unsub();
  }, [sessionId]);

  /* =========================
   * 4. memory 로딩
   * ========================= */
  useEffect(() => {
    const loadMemory = async () => {
      if (!sessionId) return;

      const snap = await getDoc(doc(db, "chat_sessions", sessionId));

      if (snap.exists()) {
        setMemory(snap.data().memory || null);
      }
    };

    loadMemory();
  }, [sessionId]);

  /* =========================
   * 5. 메시지 전송
   * ========================= */
  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    const userMsg = {
      role: "user",
      content: input,
      createdAt: serverTimestamp(),
    };

    setInput("");

    // 1) 유저 메시지 저장
    await addDoc(
      collection(db, "chat_sessions", sessionId, "messages"),
      userMsg
    );

    // 2) AI 요청
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        })),
        memory,
        uid,
      }),
    });

    const data = await res.json();

    const aiMsg = {
      role: "assistant",
      content: data.reply || "응답 실패",
      createdAt: serverTimestamp(),
    };

    // 3) AI 메시지 저장
    await addDoc(
      collection(db, "chat_sessions", sessionId, "messages"),
      aiMsg
    );

    // 4) VIP memory 업데이트
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
        { memory: mem, uid },
        { merge: true }
      );

      setMemory(mem);
    }
  };

  /* =========================
   * UI
   * ========================= */
  return (
    <div className="h-screen flex flex-col bg-gray-50">

      {/* 상단 */}
      <div className="p-3 border-b flex justify-between text-sm">
        <button onClick={() => router.back()} className="text-xl">
          ←
        </button>

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

        {messages.map((m: any, i: number) => (
          <div
            key={i}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={
                m.role === "user"
                  ? "bg-blue-500 text-white px-4 py-2 rounded-2xl max-w-xs"
                  : "bg-white border px-4 py-2 rounded-2xl max-w-xs"
              }
            >
              {m.content}
            </div>
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