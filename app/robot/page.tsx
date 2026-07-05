"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, deleteDoc, getDocs, doc, getDoc, setDoc, updateDoc,
} from "firebase/firestore";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: any; };

const THEMES = [
  { id: "sky",    label: "하늘",   blob1: "#bae6fd", blob2: "#e0f2fe", blob3: "#dbeafe", bg: "#f0f9ff" },
  { id: "violet", label: "바이올렛", blob1: "#ddd6fe", blob2: "#ede9fe", blob3: "#fae8ff", bg: "#faf5ff" },
  { id: "pink",   label: "로즈",   blob1: "#fecdd3", blob2: "#fce7f3", blob3: "#ffe4e6", bg: "#fff1f2" },
  { id: "mint",   label: "민트",   blob1: "#a7f3d0", blob2: "#d1fae5", blob3: "#ccfbf1", bg: "#f0fdf4" },
  { id: "peach",  label: "피치",   blob1: "#fed7aa", blob2: "#ffedd5", blob3: "#fef3c7", bg: "#fffbeb" },
];

const ACCENT: Record<string, { from: string; to: string; shadow: string; ring: string }> = {
  sky:    { from: "#38bdf8", to: "#6366f1", shadow: "rgba(56,189,248,0.35)", ring: "#bae6fd" },
  violet: { from: "#a78bfa", to: "#ec4899", shadow: "rgba(167,139,250,0.35)", ring: "#ddd6fe" },
  pink:   { from: "#f472b6", to: "#fb923c", shadow: "rgba(244,114,182,0.35)", ring: "#fecdd3" },
  mint:   { from: "#34d399", to: "#06b6d4", shadow: "rgba(52,211,153,0.35)", ring: "#a7f3d0" },
  peach:  { from: "#fb923c", to: "#f472b6", shadow: "rgba(251,146,60,0.35)", ring: "#fed7aa" },
};

const RobotFace = ({ size = 28, light = "#fff" }: { size?: number; light?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect x="4" y="8" width="24" height="18" rx="7" fill="#1e293b"/>
    <circle cx="11.5" cy="16.5" r="2.5" fill={light}/>
    <circle cx="20.5" cy="16.5" r="2.5" fill={light}/>
    <path d="M11 22 Q16 25 21 22" stroke={light} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <line x1="16" y1="2" x2="16" y2="8" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="16" cy="2" r="1.8" fill="#38bdf8"/>
  </svg>
);

export default function RobotPage() {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [robotName, setRobotName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [namingStep, setNamingStep] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editInput, setEditInput] = useState("");
  const [activeTheme, setActiveTheme] = useState("sky");
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const theme = THEMES.find(t => t.id === activeTheme) || THEMES[0];
  const accent = ACCENT[activeTheme] || ACCENT.sky;

  useEffect(() => { return watchAuthState(setUser); }, []);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "robotSettings", user.uid)).then((snap) => {
      if (snap.exists() && snap.data().name) setRobotName(snap.data().name);
      else setNamingStep(true);
    });
    const saved = localStorage.getItem(`chatTheme_robot_${user.uid}`);
    if (saved && THEMES.find(t => t.id === saved)) setActiveTheme(saved);
    else { const g = localStorage.getItem("globalChatTheme"); if (g && THEMES.find(t => t.id === g)) setActiveTheme(g); }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "robotChats", user.uid, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
    });
  }, [user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  const saveName = async (name: string) => {
    if (!name.trim() || !user) return;
    await setDoc(doc(db, "robotSettings", user.uid), { name: name.trim() }, { merge: true });
    setRobotName(name.trim()); setNamingStep(false);
  };

  const updateName = async () => {
    if (!editInput.trim() || !user) return;
    await updateDoc(doc(db, "robotSettings", user.uid), { name: editInput.trim() });
    setRobotName(editInput.trim()); setEditingName(false);
  };

  const streamAI = async (msgs: any[], onChunk: (t: string) => void): Promise<string> => {
    const res = await fetch("/api/ai", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs, robotName }),
    });
    if (!res.ok || !res.body) { const d = await res.json(); throw new Error(d.error || "오류"); }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") break;
        try { const delta = JSON.parse(raw).choices?.[0]?.delta?.content; if (delta) { full += delta; onChunk(full); } } catch {}
      }
    }
    return full;
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + text : text));
      inputRef.current?.focus();
    };
    recognition.start();
  };

  const send = async () => {
    if (!input.trim() || !user || isStreaming) return;
    const userText = input.trim(); setInput("");
    await addDoc(collection(db, "robotChats", user.uid, "messages"), { role: "user", content: userText, createdAt: serverTimestamp() });
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: userText });
    setIsStreaming(true); setStreamingText("");
    try {
      const full = await streamAI(history, (t) => setStreamingText(t));
      await addDoc(collection(db, "robotChats", user.uid, "messages"), { role: "assistant", content: full || "...", createdAt: serverTimestamp() });
    } catch (err: any) {
      await addDoc(collection(db, "robotChats", user.uid, "messages"), { role: "assistant", content: `오류: ${err?.message}`, createdAt: serverTimestamp() });
    } finally { setIsStreaming(false); setStreamingText(""); inputRef.current?.focus(); }
  };

  const clearHistory = async () => {
    if (!user || !confirm("대화 내역을 모두 삭제할까요?")) return;
    const snap = await getDocs(collection(db, "robotChats", user.uid, "messages"));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  };

  if (!user) return (
    <div className="fixed inset-0 flex items-center justify-center text-gray-400 text-sm bg-gray-50">로그인이 필요해요.</div>
  );

  if (namingStep) return (
    <div className="fixed inset-0 flex flex-col" style={{ background: theme.bg }}>
      <div className="relative flex flex-col items-center justify-center flex-1 gap-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full blur-3xl opacity-40" style={{ background: accent.from }}/>
          <div className="absolute bottom-20 right-8 w-32 h-32 rounded-full blur-3xl opacity-30" style={{ background: accent.to }}/>
        </div>
        <div className="relative">
          <div className="w-32 h-32 rounded-[2.5rem] flex items-center justify-center shadow-2xl"
            style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`, boxShadow: `0 20px 60px ${accent.shadow}` }}>
            <RobotFace size={60} light="white"/>
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellow-400 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-yellow-200">✨</div>
        </div>
        <div className="text-center z-10">
          <p className="font-black text-gray-800 text-2xl tracking-tight mb-1">나만의 AI 만들기</p>
          <p className="text-gray-400 text-sm">이름을 지어줘봐 🌟</p>
        </div>
        <div className="flex gap-2 w-full max-w-xs z-10">
          <input autoFocus type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveName(nameInput); }}
            placeholder="예: 루나, 별이, 챗봇..." maxLength={12}
            className="flex-1 bg-white/80 backdrop-blur-sm border-2 border-gray-100 focus:border-sky-300 rounded-2xl px-4 py-3 text-sm outline-none transition-all shadow-sm"/>
          <button onClick={() => saveName(nameInput)} disabled={!nameInput.trim()}
            className="px-5 py-3 rounded-2xl text-white text-sm font-black disabled:opacity-30 transition-all active:scale-95 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`, boxShadow: `0 8px 24px ${accent.shadow}` }}>완료</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: theme.bg }} onClick={() => setShowThemePicker(false)}>

        {/* 헤더 */}
        <div className="flex items-center justify-between shrink-0 px-4 py-3 bg-white/70 backdrop-blur-xl border-b border-white/80" style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/60 text-gray-500 hover:bg-white/90 transition active:scale-90">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <input autoFocus value={editInput} onChange={(e) => setEditInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") updateName(); if (e.key === "Escape") setEditingName(false); }}
                  maxLength={12} className="text-sm font-black text-gray-800 border-b-2 border-sky-300 outline-none w-24 bg-transparent"/>
                <button onClick={updateName} className="text-xs text-sky-500 font-bold">저장</button>
                <button onClick={() => setEditingName(false)} className="text-xs text-gray-300">✕</button>
              </div>
            ) : (
              <button onClick={() => { setEditInput(robotName || ""); setEditingName(true); }}
                className="font-black text-gray-800 text-[16px] hover:opacity-70 transition">
                {robotName}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">

  <button
    onClick={() => router.push("/studyai")}
    className="px-3 py-1 rounded-xl text-[11px] font-bold text-white transition hover:scale-105"
    style={{
      background: "linear-gradient(135deg,#f59e0b,#84cc16)",
    }}
  >
   학습용 AI
  </button>
            <button onClick={(e) => { e.stopPropagation(); setShowThemePicker(v => !v); }}
              className="w-7 h-7 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform"
              style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}/>
            <button onClick={clearHistory} className="text-[11px] text-gray-300 hover:text-red-400 transition px-2 py-1 rounded-xl hover:bg-red-50">지우기</button>
          </div>
        </div>
        

        {/* 테마 피커 — 헤더 stacking context 밖에 렌더링해야 말풍선에 안 가려짐 */}
        {showThemePicker && (
          <div className="fixed top-[56px] right-4 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/80 p-2.5 flex gap-2 z-[9999]"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}
            onClick={(e) => e.stopPropagation()}>
              

            {THEMES.map(t => {
              const a = ACCENT[t.id];
              return (
                <button key={t.id} title={t.label}
                  onClick={() => { setActiveTheme(t.id); if (user?.uid) localStorage.setItem(`chatTheme_robot_${user.uid}`, t.id); setShowThemePicker(false); }}
                  className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${activeTheme === t.id ? "scale-110" : "border-white/40"}`}
                  style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})`, borderColor: activeTheme === t.id ? a.from : undefined, boxShadow: activeTheme === t.id ? `0 0 0 2px ${a.ring}` : undefined }}/>
              );
            })}
          </div>
        )}

        {/* 채팅 영역 */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 px-2 py-5 relative">

          {/* 배경 블롭 */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-8 -left-8 w-48 h-48 rounded-full blur-3xl opacity-50" style={{ background: theme.blob1 }}/>
            <div className="absolute top-1/3 -right-10 w-40 h-40 rounded-full blur-3xl opacity-40" style={{ background: theme.blob2 }}/>
            <div className="absolute -bottom-6 left-1/3 w-36 h-36 rounded-full blur-3xl opacity-40" style={{ background: theme.blob3 }}/>
          </div>

          {messages.length === 0 && !isStreaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 pointer-events-none">
              <div className="relative">
                <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${accent.from}22, ${accent.to}22)`, border: `2px solid ${accent.ring}` }}>
                  <RobotFace size={46} light={accent.from}/>
                </div>
                <div className="absolute -top-2 -right-2 text-xl animate-bounce">💬</div>
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-gray-500 mb-1">{robotName}에게 말을 걸어봐!</p>
                <p className="text-xs text-gray-400">무엇이든 물어봐도 돼 ✨</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`relative flex ${msg.role === "user" ? "justify-end" : "justify-start"} px-1`}>
              {msg.role === "assistant" && (
                <div className="mr-2 mt-auto shrink-0 mb-0.5">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shadow-md"
                    style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}>
                    <RobotFace size={15} light="white"/>
                  </div>
                </div>
              )}
              <div className="max-w-[76%]">
                {msg.role === "assistant" && (
                  <p className="text-[10px] font-bold mb-1 ml-1" style={{ color: accent.from }}>{robotName}</p>
                )}
                <div className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap font-medium ${
                  msg.role === "user"
                    ? "text-white rounded-[1.4rem] rounded-br-md"
                    : "text-gray-800 bg-white/80 backdrop-blur-sm rounded-[1.4rem] rounded-bl-md shadow-sm"
                }`} style={msg.role === "user" ? {
                  background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                  boxShadow: `0 4px 20px ${accent.shadow}`,
                } : {}}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {isStreaming && (
            <div className="flex justify-start px-1">
              <div className="mr-2 mt-auto shrink-0 mb-0.5">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center shadow-md"
                  style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}>
                  <RobotFace size={15} light="white"/>
                </div>
              </div>
              <div className="max-w-[76%]">
              <p className="text-[10px] font-bold mb-1 ml-1" style={{ color: accent.from }}>{robotName}</p>
              <div className="px-4 py-2.5 rounded-[1.4rem] rounded-bl-md text-sm leading-relaxed whitespace-pre-wrap font-medium bg-white/80 backdrop-blur-sm text-gray-800 shadow-sm">
                {streamingText
                  ? <>{streamingText}<span className="inline-block w-0.5 h-[1.1em] rounded-full ml-0.5 align-middle animate-pulse" style={{ background: accent.from }}/></>
                  : <span className="flex gap-1 items-center py-0.5">
                      {[0, 150, 300].map((delay) => (
                        <span key={delay} className="w-2 h-2 rounded-full animate-bounce" style={{ background: accent.from, animationDelay: `${delay}ms` }}/>
                      ))}
                    </span>
                }
              </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} className="h-1"/>
        </div>

        {/* 젤리 입력창 */}
        <div className="px-4 pb-5 pt-2.5 shrink-0">
          <div className="flex items-center gap-2.5 rounded-full px-4 py-2.5 transition-all"
            style={{
              background: "rgba(255,255,255,0.72)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: `1.5px solid rgba(255,255,255,0.9)`,
              boxShadow: `0 4px 24px rgba(0,0,0,0.08), 0 0 0 1px ${accent.ring}55`,
            }}>
            <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={isStreaming ? "응답 중이야..." : `${robotName}에게 말해봐...`}
              disabled={isStreaming}
              className="flex-1 bg-transparent text-[13.5px] text-gray-700 placeholder:text-gray-400 outline-none disabled:opacity-50 font-medium"/>
            {input.trim() ? (
              <button onClick={send} disabled={isStreaming}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90"
                style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`, boxShadow: `0 4px 16px ${accent.shadow}` }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            ) : (
              <button onClick={startVoice} disabled={isStreaming || isListening}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90"
                style={{
                  background: isListening ? `linear-gradient(135deg, ${accent.from}, ${accent.to})` : "rgba(255,255,255,0.6)",
                  boxShadow: isListening ? `0 4px 16px ${accent.shadow}` : "0 2px 8px rgba(0,0,0,0.08)",
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={isListening ? "white" : accent.from} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="12" rx="3"/>
                  <path d="M5 10a7 7 0 0 0 14 0"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="9" y1="23" x2="15" y2="23"/>
                </svg>
              </button>
            )}
          </div>
        </div>

    </div>
  );
}
