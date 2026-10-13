"use client";

import { readAIStream } from "@/lib/ai-stream";
import AIResponse from "@/components/AIResponse";
import AIUserMessage from "@/components/AIUserMessage";
import RobotWelcomeArt from "@/components/RobotWelcomeArt";
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, deleteDoc, doc, getDoc, setDoc, updateDoc,
} from "firebase/firestore";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: any; sessionId?: string; };

const accent = { from: "#64748b", to: "#1e293b", shadow: "rgba(100,116,139,0.18)", ring: "#e2e8f0" };

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("model_not_found") || m.includes("model") && m.includes("not")) return "AI 모델 연결을 확인해야 해. 잠시 후 다시 시도해 줘.";
  if (m.includes("permission") || m.includes("insufficient")) return "대화를 저장할 권한이 없어. 다시 로그인해 줘.";
  if (m.includes("empty response")) return "답변이 비어 있었어. 한 번 더 보내 줄래?";
  if (m.includes("rate limit") || m.includes("tpd") || m.includes("tokens per day") || m.includes("try again in")) {
    const wait = msg.match(/try again in ([^.]+(?:\.\d+)?s?)/i)?.[1];
    const minutes = Number(wait?.match(/(\d+)m/)?.[1] || 0);
    const seconds = Number(wait?.match(/([\d.]+)s/)?.[1] || 0);
    const hours = Number(wait?.match(/(\d+)h/)?.[1] || 0);
    const totalMinutes = Math.ceil((hours * 3600 + minutes * 60 + seconds) / 60);
    return totalMinutes > 0
      ? `지금 AI 요청이 한도에 걸렸어. 약 ${totalMinutes}분 후에 다시 보내 줘.`
      : "지금 AI 요청이 한도에 걸렸어. 잠시 후 다시 보내 줘.";
  }
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network")) {
    return "인터넷 연결을 확인해봐 📶";
  }
  if (m.includes("서버 오류") || m.includes("500") || m.includes("server")) {
    return "AI 서버가 잠시 불안정해. 다시 해봐 🔄";
  }
  if (m.includes("401") || m.includes("403") || m.includes("unauthorized") || m.includes("missing")) {
    return "AI 연결 설정에 문제가 있어. 잠시 후 다시 해봐 🔧";
  }
  return "AI가 잠시 응답을 못 했어. 다시 해봐 🔄";
}

export default function RobotPage() {
  const [user, setUser] = useState<any>(null);
  const [allMessages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [historyReady, setHistoryReady] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const historyDialog = useRef<HTMLDialogElement>(null);
  const sendingRef = useRef(false);
  const messages = useMemo(() => allMessages.filter(m => (m.sessionId || "legacy") === sessionId), [allMessages, sessionId]);
  const conversations = useMemo(() => {
    const groups = new Map<string, { id: string; title: string; preview: string; time: number }>();
    for (const message of allMessages) {
      const id = message.sessionId || "legacy";
      const time = message.createdAt?.toMillis?.() || Date.now();
      const existing = groups.get(id);
      if (!existing) groups.set(id, { id, title: message.content.slice(0, 32), preview: message.content, time });
      else { existing.preview = message.content; existing.time = Math.max(existing.time, time); }
    }
    return Array.from(groups.values()).sort((a, b) => b.time - a.time);
  }, [allMessages]);
  useEffect(() => { if (showHistory) historyDialog.current?.showModal(); else historyDialog.current?.close(); }, [showHistory]);
  const openConversation = (id: string | null) => {
    if (sendingRef.current) return;
    setSessionId(id); setInput(""); setErrorMsg(null); setStreamingText(""); setShowHistory(false);
  };
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [robotName, setRobotName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [namingStep, setNamingStep] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editInput, setEditInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => { return watchAuthState(setUser); }, []);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "robotSettings", user.uid)).then((snap) => {
      if (snap.exists() && snap.data().name) setRobotName(snap.data().name);
      else setNamingStep(true);
    });
  }, [user]);

  useEffect(() => {
    setMessages([]); setSessionId(null); setHistoryReady(false); setHistoryError(false);
    if (!user) return;
    const q = query(collection(db, "robotChats", user.uid, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
      setHistoryReady(true); setHistoryError(false);
    }, () => { setHistoryError(true); setHistoryReady(false); });
  }, [user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  const saveName = async (name: string) => {
    if (!name.trim() || !user || savingName) return;
    setSavingName(true); setNameError("");
    try {
      await setDoc(doc(db, "robotSettings", user.uid), { name: name.trim().slice(0, 12) }, { merge: true });
      setRobotName(name.trim().slice(0, 12)); setNamingStep(false);
    } catch { setNameError("이름을 저장하지 못했어. 연결을 확인하고 다시 눌러 줘."); }
    finally { setSavingName(false); }
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
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || `server ${res.status}`);
    }
    if (!res.body) throw new Error("empty response");
    return readAIStream(res.body, onChunk);
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
    if (!input.trim() || !user || sendingRef.current || !historyReady) return;
    sendingRef.current = true;
    const targetSession = sessionId || crypto.randomUUID();
    setSessionId(targetSession);
    const userText = input.trim(); setInput(""); setErrorMsg(null);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: userText });
    setIsStreaming(true); setStreamingText("");
    try {
      await addDoc(collection(db, "robotChats", user.uid, "messages"), { sessionId: targetSession, role: "user", content: userText, createdAt: serverTimestamp() });
      const full = await streamAI(history, (t) => setStreamingText(t));
      await addDoc(collection(db, "robotChats", user.uid, "messages"), { sessionId: targetSession, role: "assistant", content: full, createdAt: serverTimestamp() });
    } catch (err: any) {
      setErrorMsg(friendlyError(err?.message || ""));
    } finally { sendingRef.current = false; setIsStreaming(false); setStreamingText(""); inputRef.current?.focus(); }
  };

  const clearHistory = async () => {
    if (!user || sendingRef.current || !sessionId || !confirm("이 대화만 삭제할까? 다른 대화는 그대로 남아.")) return;
    try {
      await Promise.all(messages.map(m => deleteDoc(doc(db, "robotChats", user.uid, "messages", m.id))));
      openConversation(null);
    } catch { setErrorMsg("대화를 삭제하지 못했어. 다시 시도해 줘."); }
  };

  if (!user) return (
    <div className="fixed inset-0 flex items-center justify-center text-gray-400 text-sm bg-gray-50">로그인이 필요해요.</div>
  );

  if (namingStep) return (
    <main className="fixed inset-0 overflow-y-auto text-slate-800" style={{ background: "#fff" }}>
      <header className="flex items-center gap-3 px-5 py-5" style={{ paddingTop: "max(20px, env(safe-area-inset-top))" }}>
        <button aria-label="뒤로가기" onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white/70 text-slate-500 transition hover:bg-white">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m14 6-6 6 6 6" /></svg>
        </button>
        <span className="text-xs font-semibold tracking-[0.2em] text-slate-500">WAGIE AI</span>
      </header>
      <div className="mx-auto flex w-full max-w-md flex-col px-6 pb-10 pt-2 sm:pt-8">
        <RobotWelcomeArt color="#38bdf8" />
        <div className="mb-8 mt-2 text-center">
          <p className="mb-3 text-xs font-medium tracking-widest text-slate-400">처음 만나는 너에게</p>
          <h1 className="text-[30px] font-semibold leading-[1.35] tracking-tight">안녕.<br /><span className="relative isolate inline-block"><span aria-hidden="true" className="absolute -bottom-0.5 left-0 right-0 -z-10 h-2 rounded-full bg-amber-100 blur-[3px] shadow-[0_0_14px_rgba(253,230,138,0.65)]" />무슨 얘기부터 할까?</span></h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-500">그냥 심심해서 와도 좋아.<br />그 전에, 나를 뭐라고 부르고 싶어?</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); void saveName(nameInput); }} className="rounded-[28px] border border-white bg-white/80 p-5 shadow-[0_12px_48px_-20px_rgba(51,65,85,0.2)] backdrop-blur-xl">
          <label htmlFor="robot-first-name" className="mb-3 block text-xs font-semibold text-slate-600">너만의 AI 이름</label>
          <div className="flex items-center rounded-2xl border border-slate-200/70 bg-white px-4 focus-within:ring-2" style={{ borderColor: nameInput ? accent.ring : undefined }}>
            <input id="robot-first-name" type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault(); }}
              placeholder="어떤 이름으로 부를까?" autoComplete="off" maxLength={12} disabled={savingName}
              className="min-w-0 flex-1 bg-transparent py-4 text-base text-slate-800 outline-none placeholder:text-slate-300" />
            <span className="ml-2 text-[10px] tabular-nums text-slate-400">{nameInput.length}/12</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs"><span className="mr-1 text-slate-400">이런 이름은?</span>{["루미", "모모", "구름"].map(name => <button key={name} type="button" disabled={savingName} onClick={() => setNameInput(name)} className="rounded-full bg-slate-50 px-3 py-1.5 text-slate-500 transition hover:bg-slate-100">{name}</button>)}</div>
          {nameError && <p role="alert" className="mt-3 text-xs text-red-500">{nameError}</p>}
          <button type="submit" disabled={!nameInput.trim() || savingName} className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-800 py-4 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.98] disabled:opacity-30">
            {savingName ? "이름 기억하는 중…" : "우리, 이야기 시작할까?"}
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-400">이름은 나중에도 바꿀 수 있어.</p>
      </div>
    </main>
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-white">

        <dialog ref={historyDialog} onCancel={() => setShowHistory(false)} onClose={() => setShowHistory(false)} className="m-0 h-dvh max-h-none w-[min(85vw,340px)] max-w-none border-0 bg-white p-5 shadow-2xl backdrop:bg-slate-900/25">
          <div className="mb-6 flex items-center justify-between"><h2 className="font-semibold text-slate-800">최근 채팅</h2><button aria-label="목록 닫기" onClick={() => setShowHistory(false)} className="h-10 w-10 text-slate-500">✕</button></div>
          <button disabled={isStreaming || !historyReady} onClick={() => openConversation(null)} className="mb-5 w-full rounded-2xl bg-slate-100 px-4 py-3 text-left text-sm font-medium disabled:opacity-40">＋ 새 채팅</button>
          {historyError ? <p role="alert" className="text-sm text-red-500">대화 목록을 불러오지 못했어. 페이지를 새로고침해 줘.</p> : !historyReady ? <p className="text-sm text-slate-400">대화를 불러오는 중…</p> : conversations.length === 0 ? <p className="text-sm text-slate-400">첫 이야기를 시작해 봐.</p> : conversations.map(chat => (
            <button key={chat.id} disabled={isStreaming || !historyReady} onClick={() => openConversation(chat.id)} aria-current={chat.id === sessionId ? "page" : undefined} className={`mb-2 w-full rounded-2xl p-3 text-left transition hover:bg-slate-50 disabled:opacity-40 ${chat.id === sessionId ? "bg-slate-100" : "bg-white"}`}>
              <span className="block truncate text-sm font-medium text-slate-800">{chat.title || "이전 대화"}</span>
              <span className="mt-1 block truncate text-xs text-slate-400">{chat.preview}</span>
              <span className="mt-2 block text-[10px] text-slate-400">{new Date(chat.time).toLocaleDateString("ko-KR")}</span>
            </button>
          ))}
        </dialog>
        {/* 헤더 */}
        <div className="flex items-center justify-between shrink-0 px-4 py-3 bg-white/70 backdrop-blur-xl border-b border-white/80" style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.06)" }}>
          <div className="flex min-w-0 items-center gap-2">
            <button aria-label="최근 채팅 목록" onClick={() => setShowHistory(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 6h16M4 12h12M4 18h9" /></svg></button>
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
      background: "#334155",
    }}
  >
   학습용 AI
  </button>
            <button aria-label="새 채팅" title="새 채팅" disabled={isStreaming || !historyReady} onClick={() => openConversation(null)} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30"><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5H5v14h14v-7M15 4l5 5M10 14l2-5 6-6 4 4-6 6-6 1Z" /></svg></button>
            <button disabled={isStreaming || !sessionId} onClick={clearHistory} className="text-[11px] text-gray-300 hover:text-red-400 transition px-2 py-1 rounded-xl hover:bg-red-50">지우기</button>
          </div>
        </div>
        

        {/* White surface with soft pearl light; decoration never intercepts input. */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 px-5 py-6 relative" style={{ background: "#fff" }}>
          {messages.length === 0 && !isStreaming && (
            <section className="relative m-auto w-full max-w-md px-5 py-6">
              <RobotWelcomeArt color="#38bdf8" compact />
              <p className="mt-4 text-center text-xs font-medium text-slate-500">나는 {robotName || "너의 AI"}야</p>
              <h1 className="mt-3 text-center text-[28px] font-semibold leading-snug tracking-tight text-slate-800">왔네, 안녕!<br /><span className="relative isolate inline-block"><span aria-hidden="true" className="absolute -bottom-0.5 left-0 right-0 -z-10 h-2 rounded-full bg-amber-100 blur-[3px] shadow-[0_0_14px_rgba(253,230,138,0.65)]" />오늘 너는 어땠어?</span></h1>
              <p className="mb-6 mt-3 text-center text-sm leading-relaxed text-slate-500">엄청 특별한 얘기 아니어도 돼.<br />아래에서 골라도, 네 얘기부터 해도 좋아.</p>
              <div className="space-y-2.5">
                {[
                  { title: "그냥 심심해서 왔어", sub: "엉뚱한 질문 하나로 시작해 볼까?", prompt: "그냥 심심해서 왔어. 뻔하지 않은 질문 하나 해 줘!" },
                  { title: "나 오늘 이런 일 있었잖아", sub: "좋았던 일도, 조금 짜증 난 일도", prompt: "나 오늘 있었던 일 얘기하고 싶어. 들어줄래?" },
                  { title: "말로 하기 좀 애매한데…", sub: "잘 정리해서 말하지 않아도 괜찮아", prompt: "뭐라고 설명해야 할지 모르겠는데, 질문 하나씩 해줄래?" },
                ].map(item => <button key={item.title} type="button" onClick={() => { setInput(item.prompt); inputRef.current?.focus(); }}
                  className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/90 bg-white/75 px-4 py-3.5 text-left shadow-[0_3px_16px_-10px_rgba(51,65,85,0.2)] backdrop-blur-sm transition hover:bg-white active:scale-[0.99]">
                  <span><span className="block text-sm font-medium text-slate-700">{item.title}</span><span className="mt-1 block text-xs text-slate-400">{item.sub}</span></span>
                  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-300 transition group-hover:text-slate-600"><path d="m9 6 6 6-6 6" /></svg>
                </button>)}
              </div>
            </section>
          )}

          {messages.map(msg => (
            <div key={msg.id} className="relative mx-auto w-full max-w-2xl">
              {msg.role === "user" ? (
                <AIUserMessage content={msg.content} disabled={isStreaming} onSave={async text => { await updateDoc(doc(db, "robotChats", user.uid, "messages", msg.id), { content: text, edited: true }); }} onDelete={async () => { await deleteDoc(doc(db, "robotChats", user.uid, "messages", msg.id)); }} />

              ) : (
                <article className="py-3 text-[15px] leading-7 text-slate-800">
                  <p className="mb-2 text-xs font-medium text-slate-400">{robotName}</p>
                  <div className="whitespace-pre-wrap break-words"><AIResponse text={msg.content} /></div>
                </article>
              )}
            </div>
          ))}
          {isStreaming && (
            <article aria-busy="true" className="relative mx-auto w-full max-w-2xl py-3 text-[15px] leading-7 text-slate-800">
              <p className="mb-2 text-xs font-medium text-slate-400">{robotName}</p>
              <div className="whitespace-pre-wrap break-words">
                {streamingText ? <><AIResponse text={streamingText} /><span className="ml-1 inline-block h-4 w-0.5 bg-slate-400 align-middle animate-pulse" /></> : (
                  <span aria-label="답변 생각 중" className="flex gap-1 py-2">{[0,150,300].map(delay => <span key={delay} className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${delay}ms` }} />)}</span>
                )}
              </div>
            </article>
          )}
          <div ref={bottomRef} className="h-1"/>
        </div>

        {/* 에러 메시지 */}
        {errorMsg && (
          <div className="mx-4 mb-2 px-4 py-2.5 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between shrink-0">
            <span className="text-xs text-red-600 leading-snug">⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-2 text-red-300 text-sm font-bold shrink-0">✕</button>
          </div>
        )}

        {/* 젤리 입력창 */}
        <div className="px-4 pb-5 pt-2.5 shrink-0">
          <div className="relative flex items-center gap-2.5 rounded-full px-5 py-3 transition-all overflow-hidden"
            style={{
              background: `linear-gradient(160deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.58) 100%)`,
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              border: `1.5px solid rgba(255,255,255,0.95)`,
              boxShadow: `
                0 12px 36px rgba(0,0,0,0.10),
                0 4px 12px rgba(0,0,0,0.06),
                0 0 0 1px ${accent.ring}44,
                inset 0 1.5px 0 rgba(255,255,255,0.95),
                inset 0 -1px 0 rgba(0,0,0,0.04),
                0 0 32px ${accent.ring}22
              `.replace(/\s+/g, " "),
            }}>
            {/* 상단 광택 */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "52%",
              background: "linear-gradient(to bottom, rgba(255,255,255,0.60), rgba(255,255,255,0))",
              borderRadius: "999px 999px 0 0",
              pointerEvents: "none",
            }} />
            <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
              placeholder={isStreaming ? "응답 중이야..." : `${robotName}에게 말해봐...`}
              disabled={isStreaming || !historyReady}
              className="relative flex-1 bg-transparent text-[13.5px] text-gray-700 placeholder:text-gray-400 outline-none disabled:opacity-50 font-medium z-10"/>
            {input.trim() ? (
              <button onClick={send} disabled={isStreaming || !historyReady}
                className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90"
                style={{
                  background: `linear-gradient(145deg, ${accent.from}, ${accent.to})`,
                  boxShadow: `0 6px 20px ${accent.shadow}, inset 0 1px 0 rgba(255,255,255,0.4)`,
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            ) : (
              <button onClick={startVoice} disabled={isStreaming || isListening}
                className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90"
                style={{
                  background: isListening
                    ? `linear-gradient(145deg, ${accent.from}, ${accent.to})`
                    : "linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))",
                  boxShadow: isListening
                    ? `0 6px 20px ${accent.shadow}, inset 0 1px 0 rgba(255,255,255,0.4)`
                    : "0 3px 10px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
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
