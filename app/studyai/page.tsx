"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, getDocs, deleteDoc, doc, getDoc,
} from "firebase/firestore";

type StudyMsg = { id: string; role: "user" | "ai"; content: string; createdAt: any; };

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("rate limit") || m.includes("tpd") || m.includes("tokens per day") || m.includes("try again in")) {
    const minMatch = msg.match(/try again in (\d+)m/i);
    return minMatch
      ? `오늘 AI 사용량이 꽉 찼어. 약 ${minMatch[1]}분 후에 다시 해봐 🕐`
      : "오늘 AI 사용량이 꽉 찼어. 잠시 후에 다시 해봐 🕐";
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

function Hl({ text }: { text: string }) {
  const parts = text.split(/(\[\[.*?\]\])/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("[[") && p.endsWith("]]")
          ? <mark key={i} style={{ background: "linear-gradient(transparent 52%, #fde04790 52%)", padding: "0 2px", borderRadius: 3, fontWeight: 700, textDecoration: "underline", textDecorationColor: "#fbbf24", textUnderlineOffset: 2 }}>{p.slice(2, -2)}</mark>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

function CheckList({ items }: { items: Array<{ checked: boolean; text: string }> }) {
  const [checks, setChecks] = useState(items.map(i => i.checked));
  return (
    <ul className="my-2 space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 cursor-pointer select-none"
          onClick={() => setChecks(p => { const n = [...p]; n[i] = !n[i]; return n; })}>
          <span className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center text-[10px] font-bold transition-all ${checks[i] ? "bg-amber-400 border-amber-400 text-white" : "border-amber-300"}`}>
            {checks[i] ? "✓" : ""}
          </span>
          <span className={`text-sm leading-relaxed ${checks[i] ? "line-through text-gray-400" : "text-gray-700"}`}>
            <Hl text={item.text} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function StudyTable({ lines }: { lines: string[] }) {
  const rows = lines
    .filter(l => !/^\s*\|[\s\-|:]+\|\s*$/.test(l))
    .map(l =>
      l.trim()
        .replace(/^\|/, "").replace(/\|$/, "")
        .split("|")
        .map(c => c.trim())
    )
    .filter(r => r.some(c => c.length > 0));

  if (rows.length === 0) return null;
  const [header, ...body] = rows;

  return (
    <div className="overflow-x-auto my-3 rounded-xl border border-amber-200 shadow-sm">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-bold text-amber-800 bg-amber-50 border-b border-amber-200 whitespace-nowrap">
                <Hl text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? "#fff" : "#fffbf030" }}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-gray-700 border-b border-amber-100 align-top">
                  <Hl text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SECTION_COLORS: Record<string, string> = {
  체크리스트: "#f59e0b", 표: "#3b82f6", 단어장: "#10b981", 노트: "#8b5cf6",
};

function RichContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) { i++; continue; }

    // Table block
    if (trimmed.startsWith("|")) {
      const tLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tLines.push(lines[i]);
        i++;
      }
      nodes.push(<StudyTable key={k++} lines={tLines} />);
      continue;
    }

    // Section labels
    const sec = trimmed.match(/^\[(체크리스트|표|단어장|노트)\]$/);
    if (sec) {
      const col = SECTION_COLORS[sec[1]] || "#6b7280";
      nodes.push(
        <div key={k++} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black my-2"
          style={{ background: col + "18", color: col, border: `1px solid ${col}40` }}>
          {trimmed}
        </div>
      );
      i++; continue;
    }

    // Headings
    if (trimmed.startsWith("## ")) {
      nodes.push(<h3 key={k++} className="text-[15px] font-black text-gray-800 mt-4 mb-1.5"><Hl text={trimmed.slice(3)} /></h3>);
      i++; continue;
    }
    if (trimmed.startsWith("# ")) {
      nodes.push(<h2 key={k++} className="text-[17px] font-black text-amber-800 mt-5 mb-2"><Hl text={trimmed.slice(2)} /></h2>);
      i++; continue;
    }

    // Checklist
    if (trimmed.startsWith("- [ ] ") || trimmed.startsWith("- [x] ")) {
      const items: Array<{ checked: boolean; text: string }> = [];
      while (i < lines.length && (lines[i].trim().startsWith("- [ ] ") || lines[i].trim().startsWith("- [x] "))) {
        const t = lines[i].trim();
        items.push({ checked: t.startsWith("- [x]"), text: t.replace(/^- \[.\] /, "") });
        i++;
      }
      nodes.push(<CheckList key={k++} items={items} />);
      continue;
    }

    // Regular list
    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      nodes.push(
        <ul key={k++} className="my-2 space-y-1.5 list-none">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              <Hl text={item} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Paragraph
    nodes.push(
      <p key={k++} className="text-[13.5px] leading-[1.85] text-gray-700 my-1.5">
        <Hl text={trimmed} />
      </p>
    );
    i++;
  }

  return <>{nodes}</>;
}

export default function StudyAIPage() {
  const [user, setUser] = useState<any>(null);
  const [isVIP, setIsVIP] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<StudyMsg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => { return watchAuthState(setUser); }, []);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then(snap => {
      setIsVIP(snap.data()?.isVIP === true);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "studyChats", user.uid, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyMsg)));
    });
  }, [user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  const uploadImages = (files: FileList | null) => {
    if (!files) return;
    setPendingImages(prev => [...prev, ...Array.from(files).map(f => URL.createObjectURL(f))]);
  };

  const removeImage = (idx: number) => setPendingImages(prev => prev.filter((_, i) => i !== idx));

  const send = async () => {
    if (!input.trim() || !user || isStreaming) return;
    const userText = input.trim();
    setInput("");
    setErrorMsg(null);
    setPendingImages([]);

    await addDoc(collection(db, "studyChats", user.uid, "messages"), {
      role: "user", content: userText, createdAt: serverTimestamp(),
    });

    const history = messages.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }));
    history.push({ role: "user", content: userText });

    setIsStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "study", robotName: "학습용 AI", messages: history }),
      });

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "응답 실패");
      }

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
          try {
            const delta = JSON.parse(raw).choices?.[0]?.delta?.content;
            if (delta) { full += delta; setStreamingText(full); }
          } catch {}
        }
      }

      await addDoc(collection(db, "studyChats", user.uid, "messages"), {
        role: "ai", content: full || "...", createdAt: serverTimestamp(),
      });
    } catch (err: any) {
      setErrorMsg(friendlyError(err?.message || ""));
    } finally {
      setIsStreaming(false);
      setStreamingText("");
    }
  };

  const clearHistory = async () => {
    if (!user || !confirm("학습 내용을 모두 삭제할까요?")) return;
    const snap = await getDocs(collection(db, "studyChats", user.uid, "messages"));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  };

  if (!user) return (
    <div className="fixed inset-0 flex items-center justify-center text-gray-400 text-sm" style={{ background: "linear-gradient(160deg, #fffbeb 0%, #f0fdf4 100%)" }}>
      로그인이 필요해요.
    </div>
  );

  if (isVIP === false) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6 gap-5" style={{ background: "linear-gradient(160deg, #fffbeb 0%, #f0fdf4 100%)" }}>
      <button onClick={() => router.back()} style={{
        position: "absolute", top: 20, left: 20,
        width: 40, height: 40, borderRadius: 13,
        background: "rgba(255,255,255,0.8)", border: "1.5px solid rgba(0,0,0,0.07)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontSize: 18, color: "#636e72",
      }}>←</button>
      <div style={{
        width: "100%", maxWidth: 340,
        background: "#fff", borderRadius: 28,
        border: "2px solid #f5c842",
        boxShadow: "0 8px 40px rgba(245,200,66,0.18)",
        padding: "36px 28px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        textAlign: "center",
      }}>
        <span style={{ fontSize: 52 }}>🔒</span>
        <p style={{ fontSize: 20, fontWeight: 900, color: "#1a1a1a", margin: 0 }}>학습용 AI는 VIP 전용이에요</p>
        <p style={{ fontSize: 14, color: "#888", margin: 0, lineHeight: 1.6 }}>
          VIP 구독 후 무제한으로<br />학습 AI를 사용할 수 있어요
        </p>
        <button
          onClick={() => router.push("/vip")}
          style={{
            marginTop: 8, padding: "14px 32px",
            background: "linear-gradient(135deg, #f5c842, #e8a000)",
            border: "none", borderRadius: 16,
            color: "#fff", fontWeight: 900, fontSize: 16,
            cursor: "pointer", width: "100%",
            boxShadow: "0 6px 20px rgba(245,200,66,0.35)",
          }}
        >👑 VIP 구독하기</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "linear-gradient(160deg, #fffbeb 0%, #f0fdf4 100%)" }}>

      {/* 헤더 */}
      <div className="flex items-center justify-between shrink-0 px-4 py-3 bg-white/70 backdrop-blur-xl border-b border-amber-100/80"
        style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/60 text-gray-500 hover:bg-white/90 transition active:scale-90">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div>
            <div className="font-black text-gray-800 text-[15px] flex items-center gap-1">
              📚 학습용 AI
            </div>
            <div className="text-[10px] text-amber-600 font-medium leading-none mt-0.5">줄글 · 형광펜 · 표 · 체크리스트</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border active:scale-95 transition"
            style={{ background: "#fffbeb", color: "#b45309", borderColor: "#fcd34d80" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            이미지
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => uploadImages(e.target.files)} />
          <button onClick={clearHistory} className="text-[11px] text-gray-300 hover:text-red-400 transition px-2 py-1 rounded-xl hover:bg-red-50">지우기</button>
        </div>
      </div>

      {/* 배경 블롭 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full blur-3xl opacity-30" style={{ background: "#fde68a" }}/>
        <div className="absolute top-1/2 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20" style={{ background: "#a7f3d0" }}/>
        <div className="absolute -bottom-8 left-1/4 w-36 h-36 rounded-full blur-3xl opacity-25" style={{ background: "#fde68a" }}/>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 relative z-10">

        {/* 빈 상태 */}
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full py-20 gap-4 text-center pointer-events-none">
            <div className="w-20 h-20 rounded-[1.8rem] flex items-center justify-center text-4xl shadow-xl"
              style={{ background: "linear-gradient(135deg, #fde68a, #a7f3d0)", boxShadow: "0 8px 30px rgba(251,191,36,0.28)" }}>
              📚
            </div>
            <div>
              <p className="font-black text-gray-700 text-base">학습용 AI와 공부 시작!</p>
              <p className="text-xs text-gray-400 mt-1">표 · 체크리스트 · 단어장 · 노트로 정리해줄게</p>
            </div>
          </div>
        )}

        {/* 메시지 */}
        {messages.map(msg => (
          <div key={msg.id}>
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div className="inline-flex items-start gap-1.5 max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #84cc16)", boxShadow: "0 4px 16px rgba(245,158,11,0.28)" }}>
                  <span className="mt-0.5">🙋</span>
                  <span>{msg.content}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white/90 border border-amber-100 px-5 py-4"
                style={{ boxShadow: "0 2px 16px rgba(120,84,20,0.07)" }}>
                <div className="text-[10px] font-bold text-amber-500 mb-3 flex items-center gap-1">
                  <span>📚</span> 학습용 AI
                </div>
                <RichContent text={msg.content} />
              </div>
            )}
          </div>
        ))}

        {/* 스트리밍 */}
        {isStreaming && (
          <div className="rounded-2xl bg-white/90 border border-amber-100 px-5 py-4"
            style={{ boxShadow: "0 2px 16px rgba(120,84,20,0.07)" }}>
            <div className="text-[10px] font-bold text-amber-500 mb-3 flex items-center gap-1">
              <span>📚</span> 학습용 AI
            </div>
            {streamingText ? (
              <>
                <RichContent text={streamingText} />
                <span className="inline-block w-0.5 h-4 rounded-full ml-0.5 align-middle animate-pulse" style={{ background: "#f59e0b" }} />
              </>
            ) : (
              <div className="flex gap-1 items-center py-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#fcd34d", animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* 에러 */}
      {errorMsg && (
        <div className="mx-4 mb-2 px-4 py-2.5 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between shrink-0 z-10">
          <span className="text-xs text-red-600 leading-snug">⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-2 text-red-300 text-sm font-bold shrink-0">✕</button>
        </div>
      )}

      {/* 이미지 미리보기 */}
      {pendingImages.length > 0 && (
        <div className="px-4 pb-1.5 flex gap-2 overflow-x-auto shrink-0 z-10">
          {pendingImages.map((src, i) => (
            <div key={i} className="relative shrink-0">
              <img src={src} alt="" className="w-14 h-14 rounded-xl object-cover border-2 border-amber-200" />
              <button onClick={() => removeImage(i)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 입력창 */}
      <div className="px-4 pb-5 pt-1.5 shrink-0 z-10">
        <div className="flex items-end gap-2.5 rounded-3xl px-4 py-3 transition-all"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1.5px solid rgba(251,191,36,0.45)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(251,191,36,0.2)",
          }}>
          <textarea ref={textareaRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={isStreaming ? "정리 중이야..." : "공부할 내용을 적어봐 (예: 세포분열 정리해 줘)"}
            disabled={isStreaming} rows={2}
            className="flex-1 bg-transparent text-[13.5px] text-gray-700 placeholder:text-gray-400 outline-none resize-none disabled:opacity-50 font-medium leading-relaxed" />
          <button onClick={send} disabled={isStreaming || !input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #f59e0b, #84cc16)", boxShadow: "0 4px 16px rgba(245,158,11,0.35)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-300 mt-1.5">Enter → 전송 · Shift+Enter → 줄바꿈</p>
      </div>
    </div>
  );
}
