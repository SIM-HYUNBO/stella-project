"use client";

import { useEffect, useState, useRef } from "react";
import PageContainer from "../../components/PageContainer";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  getDocs,
} from "firebase/firestore";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: any;
};

export default function RobotPage() {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return watchAuthState(setUser);
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "robotChats", user.uid, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message))
      );
    });

    return unsub;
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !user || loading) return;

    const userText = input.trim();
    setInput("");
    setLoading(true);

    await addDoc(collection(db, "robotChats", user.uid, "messages"), {
      role: "user",
      content: userText,
      createdAt: serverTimestamp(),
    });

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: userText });

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        await addDoc(collection(db, "robotChats", user.uid, "messages"), {
          role: "assistant",
          content: `오류: ${data.error || "알 수 없는 오류"}`,
          createdAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "robotChats", user.uid, "messages"), {
          role: "assistant",
          content: data.reply,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      await addDoc(collection(db, "robotChats", user.uid, "messages"), {
        role: "assistant",
        content: `오류: ${err?.message || "네트워크 오류"}`,
        createdAt: serverTimestamp(),
      });
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    if (!confirm("대화 내역을 모두 삭제할까요?")) return;
    const snap = await getDocs(collection(db, "robotChats", user.uid, "messages"));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  };

  if (!user) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-[60vh] text-gray-400">
          로그인이 필요해요.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col h-[calc(100vh-130px)]">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-[12px] bg-sky-100 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="18" height="13" rx="2"/>
                <path d="M9 8V6a3 3 0 0 1 6 0v2"/>
                <circle cx="9" cy="14" r="1.5" fill="#38bdf8" stroke="none"/>
                <circle cx="15" cy="14" r="1.5" fill="#38bdf8" stroke="none"/>
                <path d="M9 18h6"/>
                <line x1="12" y1="3" x2="12" y2="5"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">AI 어시스턴트</p>
              <p className="text-xs text-gray-400">나만의 개인 AI</p>
            </div>
          </div>
          <button
            onClick={clearHistory}
            className="text-xs text-gray-400 hover:text-red-400 transition px-2 py-1 rounded-lg hover:bg-red-50"
          >
            대화 삭제
          </button>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="18" height="13" rx="2"/>
                <path d="M9 8V6a3 3 0 0 1 6 0v2"/>
                <circle cx="9" cy="14" r="1.5" fill="#cbd5e1" stroke="none"/>
                <circle cx="15" cy="14" r="1.5" fill="#cbd5e1" stroke="none"/>
                <path d="M9 18h6"/>
                <line x1="12" y1="3" x2="12" y2="5"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
              </svg>
              <p className="text-sm">무엇이든 물어보세요!</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center mr-2 mt-1 shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="8" width="18" height="13" rx="2"/>
                    <path d="M9 8V6a3 3 0 0 1 6 0v2"/>
                    <circle cx="9" cy="14" r="1.5" fill="#38bdf8" stroke="none"/>
                    <circle cx="15" cy="14" r="1.5" fill="#38bdf8" stroke="none"/>
                    <path d="M9 18h6"/>
                  </svg>
                </div>
              )}
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-sky-400 text-white rounded-tr-sm"
                    : "bg-white text-gray-800 shadow-sm rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center mr-2 mt-1 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="8" width="18" height="13" rx="2"/>
                  <path d="M9 8V6a3 3 0 0 1 6 0v2"/>
                  <circle cx="9" cy="14" r="1.5" fill="#38bdf8" stroke="none"/>
                  <circle cx="15" cy="14" r="1.5" fill="#38bdf8" stroke="none"/>
                  <path d="M9 18h6"/>
                </svg>
              </div>
              <div className="bg-white shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce [animation-delay:0ms]"/>
                <span className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce [animation-delay:150ms]"/>
                <span className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce [animation-delay:300ms]"/>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-sky-300 transition"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-2xl bg-sky-400 hover:bg-sky-500 disabled:opacity-40 transition flex items-center justify-center shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
