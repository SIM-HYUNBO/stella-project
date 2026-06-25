"use client";

import { useEffect, useState, useRef } from "react";
import PageContainer from "../../components/PageContainer";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, deleteDoc, getDocs, doc, getDoc, setDoc, updateDoc,
} from "firebase/firestore";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: any;
};

const RobotIcon = ({ size = 20, color = "#38bdf8" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="6" stroke={color} strokeWidth="1.5"/>
    <circle cx="12" cy="2" r="1.5" fill={color} stroke="none"/>
    <rect x="3" y="6" width="18" height="15" rx="5" fill="#2d3748" stroke="none"/>
    <circle cx="9" cy="12" r="1.8" fill={color} stroke="none"/>
    <circle cx="15" cy="12" r="1.8" fill={color} stroke="none"/>
    <path d="M9 17 Q12 19.5 15 17" stroke={color} strokeWidth="1.5" fill="none"/>
  </svg>
);

export default function RobotPage() {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [robotName, setRobotName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [namingStep, setNamingStep] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editInput, setEditInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { return watchAuthState(setUser); }, []);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "robotSettings", user.uid)).then((snap) => {
      if (snap.exists() && snap.data().name) {
        setRobotName(snap.data().name);
      } else {
        setNamingStep(true);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "robotChats", user.uid, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
    });
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const saveName = async (name: string) => {
    if (!name.trim() || !user) return;
    await setDoc(doc(db, "robotSettings", user.uid), { name: name.trim() }, { merge: true });
    setRobotName(name.trim());
    setNamingStep(false);
  };

  const updateName = async () => {
    if (!editInput.trim() || !user) return;
    await updateDoc(doc(db, "robotSettings", user.uid), { name: editInput.trim() });
    setRobotName(editInput.trim());
    setEditingName(false);
  };

  const send = async () => {
    if (!input.trim() || !user || loading || isStreaming) return;
    const userText = input.trim();
    setInput("");
    setLoading(true);

    await addDoc(collection(db, "robotChats", user.uid, "messages"), {
      role: "user", content: userText, createdAt: serverTimestamp(),
    });

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: userText });

    setIsStreaming(true);
    setStreamingText("");
    setLoading(false);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, robotName }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json();
        await addDoc(collection(db, "robotChats", user.uid, "messages"), {
          role: "assistant",
          content: `오류: ${data.error || "알 수 없는 오류"}`,
          createdAt: serverTimestamp(),
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              setStreamingText(fullText);
            }
          } catch {}
        }
      }

      await addDoc(collection(db, "robotChats", user.uid, "messages"), {
        role: "assistant", content: fullText || "...", createdAt: serverTimestamp(),
      });

    } catch (err: any) {
      await addDoc(collection(db, "robotChats", user.uid, "messages"), {
        role: "assistant", content: `오류: ${err?.message || "네트워크 오류"}`, createdAt: serverTimestamp(),
      });
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      inputRef.current?.focus();
    }
  };

  const clearHistory = async () => {
    if (!user || !confirm("대화 내역을 모두 삭제할까요?")) return;
    const snap = await getDocs(collection(db, "robotChats", user.uid, "messages"));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  };

  if (!user) return (
    <PageContainer>
      <div className="flex items-center justify-center h-[60vh] text-gray-400">로그인이 필요해요.</div>
    </PageContainer>
  );

  if (namingStep) return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center h-[70vh] gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-xl shadow-sky-200">
            <RobotIcon size={52} color="white"/>
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-sm shadow">✨</div>
        </div>
        <div className="text-center">
          <p className="font-black text-gray-800 text-2xl mb-2">나만의 AI야!</p>
          <p className="text-gray-400 text-sm">이름을 지어줘 🤖</p>
        </div>
        <div className="flex gap-2 w-full max-w-xs">
          <input
            autoFocus
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveName(nameInput); }}
            placeholder="AI 이름 입력..."
            maxLength={12}
            className="flex-1 border-2 border-sky-100 focus:border-sky-300 rounded-2xl px-4 py-3 text-sm outline-none transition"
          />
          <button
            onClick={() => saveName(nameInput)}
            disabled={!nameInput.trim()}
            className="px-5 py-3 rounded-2xl bg-sky-400 hover:bg-sky-500 text-white text-sm font-bold disabled:opacity-40 transition"
          >
            완료
          </button>
        </div>
      </div>
    </PageContainer>
  );

  return (
    <PageContainer>
      <div className="flex flex-col h-[calc(100vh-130px)]">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-md shadow-sky-200">
                <RobotIcon size={22} color="white"/>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white"/>
            </div>
            <div>
              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={editInput}
                    onChange={(e) => setEditInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") updateName(); if (e.key === "Escape") setEditingName(false); }}
                    maxLength={12}
                    className="text-sm font-bold text-gray-800 border-b-2 border-sky-300 outline-none w-24 bg-transparent"
                  />
                  <button onClick={updateName} className="text-xs text-sky-500 font-bold">저장</button>
                  <button onClick={() => setEditingName(false)} className="text-xs text-gray-400">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditInput(robotName || ""); setEditingName(true); }}
                  className="flex items-center gap-1 font-black text-gray-800 text-sm hover:text-sky-500 transition group"
                >
                  {robotName}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 group-hover:text-sky-400 transition">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              )}
              <p className="text-[11px] text-gray-400">나만의 AI · 항상 여기 있어요</p>
            </div>
          </div>
          <button onClick={clearHistory} className="text-xs text-gray-300 hover:text-red-400 transition px-2 py-1 rounded-lg hover:bg-red-50">
            초기화
          </button>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center">
                <RobotIcon size={40} color="#7dd3fc"/>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-400 mb-1">{robotName}에게 말을 걸어봐!</p>
                <p className="text-xs text-gray-300">무엇이든 물어봐도 돼 😊</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2.5`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-sky-200">
                  <RobotIcon size={16} color="white"/>
                </div>
              )}
              <div className={`max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-sky-400 to-sky-500 text-white rounded-tr-sm shadow-md shadow-sky-100"
                    : "bg-white text-gray-800 rounded-tl-sm shadow-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {/* 스트리밍 버블 */}
          {isStreaming && (
            <div className="flex justify-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-sky-200">
                <RobotIcon size={16} color="white"/>
              </div>
              <div className="max-w-[78%]">
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed whitespace-pre-wrap bg-white text-gray-800 shadow-sm">
                  {streamingText ? (
                    <>
                      {streamingText}
                      <span className="inline-block w-0.5 h-4 bg-sky-400 ml-0.5 align-middle animate-pulse"/>
                    </>
                  ) : (
                    <span className="flex gap-1 items-center py-0.5">
                      <span className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce [animation-delay:0ms]"/>
                      <span className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce [animation-delay:150ms]"/>
                      <span className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce [animation-delay:300ms]"/>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={isStreaming ? "응답 중..." : `${robotName}에게 메시지 보내기...`}
              disabled={isStreaming}
              className="flex-1 bg-gray-50 border-2 border-gray-100 focus:border-sky-200 rounded-2xl px-4 py-2.5 text-sm outline-none transition disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={isStreaming || !input.trim()}
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-500 hover:from-sky-500 hover:to-blue-500 disabled:opacity-40 transition flex items-center justify-center shrink-0 shadow-md shadow-sky-100"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>

      </div>
    </PageContainer>
  );
}
