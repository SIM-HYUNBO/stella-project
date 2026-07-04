"use client";

import { useEffect, useState, useRef } from "react";
import PageContainer from "../../components/PageContainer";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, deleteDoc, getDocs, doc, getDoc, setDoc, updateDoc,
} from "firebase/firestore";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: any; };
type Work = { id: string; genre: string; title: string; content: string; createdAt: any; };

const CHAT_THEMES = [
  { id: "default", name: "기본", bg: "#f9fafb" },
  { id: "pink", name: "벚꽃", bg: "#fdf2f8" },
  { id: "sky", name: "하늘", bg: "#f0f9ff" },
  { id: "mint", name: "민트", bg: "#f0fdf4" },
  { id: "lavender", name: "라벤더", bg: "#faf5ff" },
  { id: "peach", name: "피치", bg: "#fff7ed" },
  { id: "lemon", name: "레몬", bg: "#fefce8" },
];

const GENRES = [
  { id: "novel", label: "소설", icon: "📖" },
  { id: "poem", label: "시", icon: "🌸" },
  { id: "lyrics", label: "가사", icon: "🎵" },
  { id: "script", label: "시나리오", icon: "🎬" },
  { id: "essay", label: "에세이", icon: "✍️" },
];

const STYLES = ["감성적인", "유머러스한", "진지한", "로맨틱한", "판타지", "공포스러운", "따뜻한", "쓸쓸한"];

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
  const [mode, setMode] = useState<"personal" | "studio">("personal");

  // 개인 AI 상태
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [robotName, setRobotName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [namingStep, setNamingStep] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editInput, setEditInput] = useState("");
  const [activeTheme, setActiveTheme] = useState("default");
  const [showThemePicker, setShowThemePicker] = useState(false);

  // 스튜디오 상태
  const [genre, setGenre] = useState("novel");
  const [style, setStyle] = useState("감성적인");
  const [studioInput, setStudioInput] = useState("");
  const [studioResult, setStudioResult] = useState("");
  const [studioStreaming, setStudioStreaming] = useState(false);
  const [studioStreamingText, setStudioStreamingText] = useState("");
  const [works, setWorks] = useState<Work[]>([]);
  const [studioView, setStudioView] = useState<"create" | "works">("create");
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [savingWork, setSavingWork] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [createMode, setCreateMode] = useState<"craft" | "longstory">("craft");
  const [longInput, setLongInput] = useState("");
  const [worksSearch, setWorksSearch] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const studioInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { return watchAuthState(setUser); }, []);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "robotSettings", user.uid)).then((snap) => {
      if (snap.exists() && snap.data().name) setRobotName(snap.data().name);
      else setNamingStep(true);
    });
    const saved = localStorage.getItem(`chatTheme_robot_${user.uid}`);
    if (saved) setActiveTheme(saved);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "robotChats", user.uid, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "studioWorks", user.uid, "works"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setWorks(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Work)));
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

  const streamAI = async (messages: any[], onChunk: (t: string) => void): Promise<string> => {
    const res = await fetch("/api/ai", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, robotName }),
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

  const send = async () => {
    if (!input.trim() || !user || loading || isStreaming) return;
    const userText = input.trim(); setInput(""); setLoading(true);
    await addDoc(collection(db, "robotChats", user.uid, "messages"), { role: "user", content: userText, createdAt: serverTimestamp() });
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: userText });
    setIsStreaming(true); setStreamingText(""); setLoading(false);
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

  const generateStudio = async () => {
    if (!studioInput.trim() || studioStreaming) return;
    const genreLabel = GENRES.find(g => g.id === genre)?.label || genre;
    const systemPrompt = `너는 창작 AI야. 사용자가 원하는 ${genreLabel}을 작성해줘. 스타일은 ${style} 느낌으로. 서론 없이 바로 작품 본문만 출력해.`;
    const prompt = `다음 소재/키워드로 ${style} ${genreLabel}을 써줘:\n${studioInput.trim()}`;
    setStudioStreaming(true); setStudioStreamingText(""); setStudioResult("");
    try {
      const full = await streamAI([{ role: "user", content: prompt }].map(m => ({ ...m })), (t) => setStudioStreamingText(t));
      setStudioResult(full);
    } catch (err: any) { setStudioResult(`오류: ${err?.message}`); }
    finally { setStudioStreaming(false); setStudioStreamingText(""); }
  };

  const generateLong = async () => {
    if (!longInput.trim() || studioStreaming) return;
    const prompt = `다음 한 줄 요약을 바탕으로 매우 길고 상세하며 몰입감 있는 소설을 써줘. 배경 묘사, 인물의 감정과 행동, 대화, 사건 전개를 풍부하게 담아서 최소 2000자 이상 써줘. 서론 없이 바로 소설 본문부터 시작해.\n\n[요약]\n${longInput.trim()}`;
    setStudioStreaming(true); setStudioStreamingText(""); setStudioResult("");
    try {
      const full = await streamAI([{ role: "user", content: prompt }], (t) => setStudioStreamingText(t));
      setStudioResult(full);
    } catch (err: any) { setStudioResult(`오류: ${err?.message}`); }
    finally { setStudioStreaming(false); setStudioStreamingText(""); }
  };

  const refineStudio = async () => {
    if (!studioResult || !refineInput.trim() || refining) return;
    const prompt = `다음 작품을 아래 지시에 따라 수정해줘. 수정된 작품 본문만 출력해.\n\n[원본]\n${studioResult}\n\n[지시]\n${refineInput.trim()}`;
    setRefining(true); setStudioStreamingText(""); setStudioResult("");
    try {
      const full = await streamAI([{ role: "user", content: prompt }], (t) => setStudioStreamingText(t));
      setStudioResult(full); setRefineInput("");
    } catch {}
    finally { setRefining(false); setStudioStreamingText(""); }
  };

  const saveWork = async () => {
    if (!studioResult || !user) return;
    setSavingWork(true);
    const genreLabel = GENRES.find(g => g.id === genre)?.label || genre;
    const firstLine = studioResult.split("\n")[0].slice(0, 30) || "제목 없음";
    await addDoc(collection(db, "studioWorks", user.uid, "works"), {
      genre: genreLabel, title: firstLine, content: studioResult, createdAt: serverTimestamp(),
    });
    setSavingWork(false); setStudioView("works");
  };

  const deleteWork = async (workId: string) => {
    if (!user || !confirm("작품을 삭제할까요?")) return;
    await deleteDoc(doc(db, "studioWorks", user.uid, "works", workId));
    if (selectedWork?.id === workId) setSelectedWork(null);
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
          <input autoFocus type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveName(nameInput); }}
            placeholder="AI 이름 입력..." maxLength={12}
            className="flex-1 border-2 border-sky-100 focus:border-sky-300 rounded-2xl px-4 py-3 text-sm outline-none transition"/>
          <button onClick={() => saveName(nameInput)} disabled={!nameInput.trim()}
            className="px-5 py-3 rounded-2xl bg-sky-400 text-white text-sm font-bold disabled:opacity-40 transition">완료</button>
        </div>
      </div>
    </PageContainer>
  );

  return (
    <PageContainer>
      <div className="flex flex-col h-[calc(100vh-130px)]">

        {/* 모드 탭 */}
        <div className="flex gap-2 mb-4 shrink-0">
          <button onClick={() => setMode("personal")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition active:scale-90 ${mode === "personal" ? "bg-sky-100" : "bg-sky-50 hover:bg-sky-100"}`}>
            <RobotIcon size={13} color="#0ea5e9"/>
            <span className="text-xs font-bold text-sky-600">개인</span>
          </button>
          <button onClick={() => setMode("studio")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition active:scale-90 ${mode === "studio" ? "bg-purple-100" : "bg-purple-50 hover:bg-purple-100"}`}>
            <span className="text-xs">✨</span>
            <span className="text-xs font-bold text-purple-500">스튜디오</span>
          </button>
        </div>

        {/* ── 개인 모드 ── */}
        {mode === "personal" && (
          <>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 shrink-0">
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
                      <input autoFocus value={editInput} onChange={(e) => setEditInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") updateName(); if (e.key === "Escape") setEditingName(false); }}
                        maxLength={12} className="text-sm font-bold text-gray-800 border-b-2 border-sky-300 outline-none w-24 bg-transparent"/>
                      <button onClick={updateName} className="text-xs text-sky-500 font-bold">저장</button>
                      <button onClick={() => setEditingName(false)} className="text-xs text-gray-400">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditInput(robotName || ""); setEditingName(true); }}
                      className="flex items-center gap-1 font-black text-gray-800 text-sm hover:text-sky-500 transition group">
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
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button onClick={() => setShowThemePicker(v => !v)}
                    className="w-8 h-8 rounded-full border-2 border-gray-200 hover:scale-105 transition-transform"
                    style={{ background: CHAT_THEMES.find(t => t.id === activeTheme)?.bg || "#f9fafb" }}
                    title="테마"/>
                  {showThemePicker && (
                    <div className="absolute right-0 top-10 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 flex gap-2 z-50">
                      {CHAT_THEMES.map(t => (
                        <button key={t.id} onClick={() => { setActiveTheme(t.id); if (user?.uid) localStorage.setItem(`chatTheme_robot_${user.uid}`, t.id); setShowThemePicker(false); }} title={t.name}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${activeTheme === t.id ? "border-sky-400 scale-110" : "border-gray-200 hover:scale-105"}`}
                          style={{ background: t.bg }}/>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={clearHistory} className="text-xs text-gray-300 hover:text-red-400 transition px-2 py-1 rounded-lg hover:bg-red-50">초기화</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 px-1 py-4 rounded-2xl -mx-1" style={{ background: CHAT_THEMES.find(t => t.id === activeTheme)?.bg || "#f9fafb" }} onClick={() => setShowThemePicker(false)}>
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
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[80%]">
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1 ml-1">
                        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                          <RobotIcon size={11} color="white"/>
                        </div>
                        <span className="text-xs text-gray-400">{robotName}</span>
                      </div>
                    )}
                    <div className={`px-4 py-3 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-sky-400 text-white rounded-br-md" : "bg-white text-gray-800 rounded-bl-md"}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="max-w-[80%]">
                    <div className="flex items-center gap-1.5 mb-1 ml-1">
                      <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                        <RobotIcon size={11} color="white"/>
                      </div>
                      <span className="text-xs text-gray-400">{robotName}</span>
                    </div>
                    <div className="px-4 py-3 rounded-3xl rounded-bl-md text-sm leading-relaxed whitespace-pre-wrap bg-white text-gray-800">
                      {streamingText ? <>{streamingText}<span className="inline-block w-0.5 h-4 bg-sky-400 ml-0.5 align-middle animate-pulse"/></> : (
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

            <div className="pt-3 border-t border-gray-100 shrink-0">
              <div className="flex gap-2">
                <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={isStreaming ? "응답 중..." : `${robotName}에게 메시지 보내기...`}
                  disabled={isStreaming}
                  className="flex-1 bg-gray-50 border-2 border-gray-100 focus:border-sky-200 rounded-2xl px-4 py-2.5 text-sm outline-none transition disabled:opacity-50"/>
                <button onClick={send} disabled={isStreaming || !input.trim()}
                  className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-500 disabled:opacity-40 transition flex items-center justify-center shrink-0 shadow-md shadow-sky-100">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── 스튜디오 모드 ── */}
        {mode === "studio" && (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* 서브 탭 */}
            <div className="flex gap-3 mb-4 shrink-0">
              <button onClick={() => setStudioView("create")}
                className={`text-sm font-black pb-1.5 border-b-2 transition-all ${studioView === "create" ? "border-purple-400 text-purple-500" : "border-transparent text-gray-300"}`}>
                ✨ 창작
              </button>
              <button onClick={() => setStudioView("works")}
                className={`text-sm font-black pb-1.5 border-b-2 transition-all ${studioView === "works" ? "border-purple-400 text-purple-500" : "border-transparent text-gray-300"}`}>
                📚 내 작품 {works.length > 0 && <span className="ml-1 text-[10px] bg-purple-100 text-purple-400 px-1.5 py-0.5 rounded-full">{works.length}</span>}
              </button>
            </div>

            {/* 창작 뷰 */}
            {studioView === "create" && (
              <div className="flex-1 overflow-y-auto flex flex-col gap-4">

                {/* 창작 모드 토글 */}
                <div className="flex gap-2">
                  <button onClick={() => { setCreateMode("craft"); setStudioResult(""); setStudioStreamingText(""); }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition active:scale-90 ${createMode === "craft" ? "bg-purple-100 text-purple-600" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}>
                    ✏️ 창작
                  </button>
                  <button onClick={() => { setCreateMode("longstory"); setStudioResult(""); setStudioStreamingText(""); }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition active:scale-90 ${createMode === "longstory" ? "bg-orange-100 text-orange-500" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}>
                    📜 긴 이야기
                  </button>
                </div>

                {/* 긴 이야기 모드 */}
                {createMode === "longstory" && (
                  <div className="flex flex-col gap-3">
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
                      <p className="text-xs font-black text-orange-400 mb-1">📜 긴 이야기 생성</p>
                      <p className="text-[11px] text-orange-300">한 줄 요약만 입력하면 AI가 길고 상세하게 써줘요</p>
                    </div>
                    <textarea value={longInput} onChange={(e) => setLongInput(e.target.value)}
                      placeholder="예: 기억을 잃은 남자가 자신의 일기장을 발견하면서 과거의 비밀을 알게 되는 이야기"
                      rows={3}
                      className="w-full bg-gray-50 border-2 border-gray-100 focus:border-orange-200 rounded-2xl px-4 py-3 text-sm outline-none transition resize-none"/>
                    <button onClick={generateLong} disabled={!longInput.trim() || studioStreaming}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-400 text-white text-sm font-black disabled:opacity-40 transition active:scale-[0.98] shadow-md shadow-orange-100">
                      {studioStreaming ? "📜 이야기 쓰는 중..." : "📜 길게 써줘"}
                    </button>
                  </div>
                )}

                {/* 일반 창작 모드 */}
                {createMode === "craft" && <>

                {/* 장르 선택 */}
                <div>
                  <p className="text-xs font-black text-gray-400 mb-2 tracking-wide">장르</p>
                  <div className="flex gap-2 flex-wrap">
                    {GENRES.map(g => (
                      <button key={g.id} onClick={() => setGenre(g.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all ${genre === g.id ? "bg-purple-400 text-white shadow-md shadow-purple-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
                        <span>{g.icon}</span>{g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 스타일 선택 */}
                <div>
                  <p className="text-xs font-black text-gray-400 mb-2 tracking-wide">스타일</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {STYLES.map(s => (
                      <button key={s} onClick={() => setStyle(s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${style === s ? "bg-purple-100 text-purple-600 border border-purple-200" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 소재/키워드 입력 */}
                <div>
                  <p className="text-xs font-black text-gray-400 mb-2 tracking-wide">소재 / 키워드</p>
                  <textarea ref={studioInputRef} value={studioInput} onChange={(e) => setStudioInput(e.target.value)}
                    placeholder={`예: 비 오는 날 지하철에서 우연히 만난 사람, 오래된 사진 한 장...`}
                    rows={3}
                    className="w-full bg-gray-50 border-2 border-gray-100 focus:border-purple-200 rounded-2xl px-4 py-3 text-sm outline-none transition resize-none"/>
                  <button onClick={generateStudio} disabled={!studioInput.trim() || studioStreaming}
                    className="mt-2 w-full py-3 rounded-2xl bg-gradient-to-r from-purple-400 to-violet-500 text-white text-sm font-black disabled:opacity-40 transition active:scale-[0.98] shadow-md shadow-purple-100">
                    {studioStreaming ? "✨ 창작 중..." : "✨ AI 창작 시작"}
                  </button>
                </div>

                </>}

                {/* 결과 */}
                {(studioStreaming || studioResult) && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{GENRES.find(g => g.id === genre)?.icon}</span>
                        <span className="text-xs font-black text-gray-500">{GENRES.find(g => g.id === genre)?.label} · {style}</span>
                      </div>
                      {studioResult && !studioStreaming && (
                        <button onClick={saveWork} disabled={savingWork}
                          className="text-xs font-black text-purple-500 bg-purple-50 px-3 py-1.5 rounded-xl hover:bg-purple-100 transition disabled:opacity-50">
                          {savingWork ? "저장 중..." : "💾 저장"}
                        </button>
                      )}
                    </div>
                    <div className="px-4 py-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[80px]">
                      {studioStreaming ? (
                        <>{studioStreamingText || ""}<span className="inline-block w-0.5 h-4 bg-purple-400 ml-0.5 align-middle animate-pulse"/></>
                      ) : studioResult}
                    </div>

                    {/* 다듬기 */}
                    {studioResult && !studioStreaming && (
                      <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                        <p className="text-[10px] font-black text-gray-300 mb-2 tracking-wide">AI에게 수정 요청</p>
                        <div className="flex gap-1.5 flex-wrap mb-2">
                          {["더 짧게", "더 길게", "더 감성적으로", "다른 버전으로", "이어서 써줘"].map(r => (
                            <button key={r} onClick={() => { setRefineInput(r); }}
                              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-gray-50 text-gray-400 hover:bg-purple-50 hover:text-purple-400 transition border border-gray-100">
                              {r}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input value={refineInput} onChange={(e) => setRefineInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && refineStudio()}
                            placeholder="직접 입력..."
                            className="flex-1 bg-gray-50 border border-gray-100 focus:border-purple-200 rounded-xl px-3 py-2 text-xs outline-none transition"/>
                          <button onClick={refineStudio} disabled={!refineInput.trim() || refining}
                            className="px-3 py-2 rounded-xl bg-purple-400 text-white text-xs font-black disabled:opacity-40 transition">
                            {refining ? "..." : "수정"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* 내 작품 뷰 */}
            {studioView === "works" && (
              <div className="flex-1 overflow-y-auto flex flex-col gap-3">
                {selectedWork ? (
                  <div className="flex flex-col gap-3">
                    <button onClick={() => setSelectedWork(null)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition">
                      ← 목록으로
                    </button>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-black text-purple-400 bg-purple-50 px-2 py-1 rounded-lg">{selectedWork.genre}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedWork.content}</p>
                    </div>
                    <button onClick={() => deleteWork(selectedWork.id)} className="text-xs text-red-400 hover:text-red-500 text-center py-1">삭제</button>
                  </div>
                ) : (
                  <>
                    {/* 검색창 */}
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <input value={worksSearch} onChange={(e) => setWorksSearch(e.target.value)}
                        placeholder="작품 검색..."
                        className="w-full bg-gray-50 border border-gray-100 focus:border-purple-200 rounded-2xl pl-8 pr-4 py-2.5 text-sm outline-none transition"/>
                      {worksSearch && (
                        <button onClick={() => setWorksSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">✕</button>
                      )}
                    </div>

                    {works.length === 0 ? (
                      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center py-16">
                        <span className="text-5xl">📭</span>
                        <p className="text-sm font-bold text-gray-300">아직 저장된 작품이 없어요</p>
                        <button onClick={() => setStudioView("create")} className="text-xs text-purple-400 font-bold">창작하러 가기 →</button>
                      </div>
                    ) : (() => {
                      const filtered = works.filter(w =>
                        w.title.includes(worksSearch) || w.content.includes(worksSearch) || w.genre.includes(worksSearch)
                      );
                      return filtered.length === 0 ? (
                        <div className="text-center py-12 text-sm text-gray-300">&quot;{worksSearch}&quot; 검색 결과 없음</div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {filtered.map(w => (
                            <button key={w.id} onClick={() => setSelectedWork(w)}
                              className="w-full bg-white rounded-2xl border border-gray-100 px-4 py-3.5 text-left hover:border-purple-100 transition active:scale-[0.99] shadow-sm">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-black text-purple-400 bg-purple-50 px-2 py-0.5 rounded-lg">{w.genre}</span>
                              </div>
                              <p className="text-sm font-bold text-gray-700 truncate">{w.title}</p>
                              <p className="text-xs text-gray-300 mt-0.5 line-clamp-2">{w.content.slice(0, 80)}...</p>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </PageContainer>
  );
}
