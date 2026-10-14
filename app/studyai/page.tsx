"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AITextLinks from "@/components/AITextLinks";
import AIMediaPicker, { AIMediaPreview } from "@/components/AIMediaPicker";
import { AIMedia, mediaHistory } from "@/lib/ai-media";
import AIUserMessage from "@/components/AIUserMessage";
import RobotWelcomeArt from "@/components/RobotWelcomeArt";
import { readAIStream } from "@/lib/ai-stream";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";

import {
  writeBatch, collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  deleteDoc, doc,
} from "firebase/firestore";

/* =========================================================
   TYPE
========================================================= */

type StudyMsg = {
  id: string;
  media?: AIMedia;
  role: "user" | "ai";
  content: string;
  createdAt: any;
};

/* =========================================================
   ERROR
========================================================= */

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();

  if (
    m.includes("rate limit") ||
    m.includes("tpd") ||
    m.includes("tokens per day") ||
    m.includes("try again in")
  ) {
    const wait = msg.match(/try again in ([^.]+(?:\.\d+)?s?)/i)?.[1];
    const minutes = Number(wait?.match(/(\d+)m/)?.[1] || 0);
    const seconds = Number(wait?.match(/([\d.]+)s/)?.[1] || 0);
    const hours = Number(wait?.match(/(\d+)h/)?.[1] || 0);
    const totalMinutes = Math.ceil((hours * 3600 + minutes * 60 + seconds) / 60);
    return totalMinutes > 0
      ? `지금 AI 요청이 한도에 걸렸어. 약 ${totalMinutes}분 후에 다시 보내 줘.`
      : "지금 AI 요청이 한도에 걸렸어. 잠시 후 다시 보내 줘.";
  }

  if (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("network")
  ) {
    return "인터넷 연결을 확인해봐 📶";
  }

  if (
    m.includes("서버 오류") ||
    m.includes("500") ||
    m.includes("server")
  ) {
    return "AI 서버가 잠시 불안정해. 다시 해봐 🔄";
  }

  if (
    m.includes("401") ||
    m.includes("403") ||
    m.includes("unauthorized") ||
    m.includes("missing")
  ) {
    return "AI 연결 설정에 문제가 있어. 잠시 후 다시 해봐 🔧";
  }

  return "AI가 잠시 응답을 못 했어. 다시 해봐 🔄";
}

/* =========================================================
   HIGHLIGHT
========================================================= */

function Hl({ text }: { text: string }) {
  const parts = text.replace(/\\([*~<>])/g, "$1").split(/(\[\[.*?\]\])/g);

  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("[[") && p.endsWith("]]") ? (
          <mark
            key={i}
            style={{
              background:
                "linear-gradient(transparent 52%, #fde04790 52%)",
              padding: "0 2px",
              borderRadius: 3,
              fontWeight: 700,
              textDecoration: "underline",
              textDecorationColor: "#fbbf24",
              textUnderlineOffset: 2,
            }}
          >
            {p.slice(2, -2)}
          </mark>
        ) : (
          <span key={i}>{p.split(/<br\s*\/?\s*>/i).map((part, j) => <span key={j}>{j > 0 && <br />}<AITextLinks text={part} /></span>)}</span>
        )
      )}
    </>
  );
}

/* =========================================================
   CHECKLIST
========================================================= */

function CheckList({
  items,
}: {
  items: Array<{
    checked: boolean;
    text: string;
  }>;
}) {
  const [checks, setChecks] = useState(
    items.map((i) => i.checked)
  );

  return (
    <ul className="my-2 space-y-1.5">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex cursor-pointer select-none items-start gap-2"
          onClick={() =>
            setChecks((p) => {
              const n = [...p];
              n[i] = !n[i];
              return n;
            })
          }
        >
          <span
            className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 text-[10px] font-bold transition-all ${
              checks[i]
                ? "border-amber-400 bg-amber-400 text-white"
                : "border-amber-300"
            }`}
          >
            {checks[i] ? "✓" : ""}
          </span>

          <span
            className={`text-sm leading-relaxed ${
              checks[i]
                ? "text-gray-400 line-through"
                : "text-gray-700"
            }`}
          >
            <Hl text={item.text} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/* =========================================================
   TABLE
========================================================= */

function StudyTable({ lines }: { lines: string[] }) {
  const rows = lines
    .filter((l) => !/^\s*\|[\s\-|:]+\|\s*$/.test(l))
    .map((l) =>
      l
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim())
    )
    .filter((r) => r.some((c) => c.length > 0));

  if (rows.length === 0) return null;

  const [header, ...body] = rows;

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {header.map((h, i) => (
              <th
                key={i}
                className="whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-bold text-slate-700"
              >
                <Hl text={h} />
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {body.map((row, ri) => (
            <tr
              key={ri}
              style={{
                background:
                  ri % 2 === 0
                    ? "#fff"
                    : "#fffbf030",
              }}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="border-b border-slate-100 px-3 py-2 align-top text-gray-700"
                >
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

/* =========================================================
   SECTION COLOR
========================================================= */

const SECTION_COLORS: Record<string, string> = {
  체크리스트: "#f59e0b",
  표: "#3b82f6",
  단어장: "#10b981",
  노트: "#8b5cf6",
};

/* =========================================================
   RICH CONTENT
========================================================= */

function RichContent({ text }: { text: string }) {
  const lines = text.split("\n");

  const nodes: React.ReactNode[] = [];

  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    /* =========================
       TABLE
    ========================= */

    if (trimmed.startsWith("|")) {
      const tLines: string[] = [];

      while (
        i < lines.length &&
        lines[i].trim().startsWith("|")
      ) {
        tLines.push(lines[i]);
        i++;
      }

      nodes.push(
        <StudyTable
          key={k++}
          lines={tLines}
        />
      );

      continue;
    }

    /* =========================
       SECTION
    ========================= */

    const sec = trimmed.match(
      /^\[(체크리스트|표|단어장|노트)\]$/
    );

    if (sec) {
      const col =
        SECTION_COLORS[sec[1]] || "#6b7280";

      nodes.push(
        <div
          key={k++}
          className="my-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black"
          style={{
            background: col + "18",
            color: col,
            border: `1px solid ${col}40`,
          }}
        >
          {trimmed}
        </div>
      );

      i++;
      continue;
    }

    /* =========================
       HEADING
    ========================= */

    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h3
          key={k++}
          className="mb-3 mt-7 text-base font-semibold text-slate-800"
        >
          <Hl text={trimmed.slice(3)} />
        </h3>
      );

      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      nodes.push(
        <h2
          key={k++}
          className="mb-3 mt-8 text-lg font-semibold text-slate-800"
        >
          <Hl text={trimmed.slice(2)} />
        </h2>
      );

      i++;
      continue;
    }

    /* =========================
       CHECKLIST
    ========================= */

    if (
      trimmed.startsWith("- [ ] ") ||
      trimmed.startsWith("- [x] ")
    ) {
      const items: Array<{
        checked: boolean;
        text: string;
      }> = [];

      while (
        i < lines.length &&
        (lines[i]
          .trim()
          .startsWith("- [ ] ") ||
          lines[i]
            .trim()
            .startsWith("- [x] "))
      ) {
        const t = lines[i].trim();

        items.push({
          checked: t.startsWith("- [x]"),
          text: t.replace(/^- \[.\] /, ""),
        });

        i++;
      }

      nodes.push(
        <CheckList
          key={k++}
          items={items}
        />
      );

      continue;
    }

    /* =========================
       LIST
    ========================= */

    if (trimmed.startsWith("- ")) {
      const items: string[] = [];

      while (
        i < lines.length &&
        lines[i].trim().startsWith("- ")
      ) {
        items.push(
          lines[i].trim().slice(2)
        );

        i++;
      }

      nodes.push(
        <ul
          key={k++}
          className="my-2 list-none space-y-1.5"
        >
          {items.map((item, j) => (
            <li
              key={j}
              className="flex items-start gap-3 text-[15px] leading-7 text-slate-700"
            >
              <span className="mt-2.5 h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />

              <Hl text={item} />
            </li>
          ))}
        </ul>
      );

      continue;
    }

    /* =========================
       PARAGRAPH
    ========================= */

    nodes.push(
      <p
        key={k++}
        className="my-3 break-words text-[15px] leading-8 text-slate-700"
      >
        <Hl text={trimmed} />
      </p>
    );

    i++;
  }

  return <>{nodes}</>;
}

/* =========================================================
   NOTE DRAWER
========================================================= */

function NoteDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  /* ESC 닫기 */
  useEffect(() => {
    if (!open) return;

    const handleEsc = (
      e: KeyboardEvent
    ) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleEsc
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEsc
      );
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* =========================
          BACKDROP
      ========================= */}

      <div
        onClick={onClose}
        className={`fixed inset-0 z-[80] bg-black/25 backdrop-blur-[2px] transition-opacity duration-300 ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* =========================
          PC DRAWER
      ========================= */}

      <div
        className={`
          fixed right-0 top-0 z-[90]
          hidden h-full
          w-[520px]
          max-w-[90vw]
          md:block
          transform
          transition-transform
          duration-300
          ease-out
          ${
            open
              ? "translate-x-0"
              : "translate-x-full"
          }
        `}
        style={{
          filter:
            "drop-shadow(-12px 0 30px rgba(0,0,0,0.14))",
        }}
      >
        <div className="relative h-full overflow-hidden border-l border-violet-100 bg-white">
          {/* 닫기 */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-[100] flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-500 shadow-sm backdrop-blur transition hover:bg-gray-100 active:scale-90"
            aria-label="노트 닫기"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          {/* NOTE PAGE */}
          <iframe
            src="/note"
            title="공부 노트"
            className="h-full w-full border-0"
          />
        </div>
      </div>

      {/* =========================
          MOBILE BOTTOM SHEET
      ========================= */}

      <div
        className={`
          fixed bottom-0 left-0 right-0
          z-[90]
          block
          h-[88dvh]
          transform
          transition-transform
          duration-300
          ease-out
          md:hidden
          ${
            open
              ? "translate-y-0"
              : "translate-y-full"
          }
        `}
      >
        <div
          className="relative h-full overflow-hidden rounded-t-[28px] border-t border-violet-100 bg-white"
          style={{
            boxShadow:
              "0 -15px 45px rgba(0,0,0,0.18)",
          }}
        >
          {/* HANDLE */}
          <div className="absolute left-0 right-0 top-0 z-[100] flex h-8 items-start justify-center bg-white/80 pt-2 backdrop-blur">
            <div className="h-1.5 w-12 rounded-full bg-gray-300" />
          </div>

          {/* 닫기 */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-[110] flex h-8 w-8 items-center justify-center rounded-full bg-gray-100/90 text-gray-500 transition active:scale-90"
            aria-label="노트 닫기"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          {/* NOTE PAGE */}
          <iframe
            src="/note"
            title="공부 노트"
            className="h-full w-full border-0 pt-7"
          />
        </div>
      </div>
    </>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function StudyAIPage() {
  const [pendingMedia, setPendingMedia] = useState<AIMedia | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const sendingRef = useRef(false);
  const [user, setUser] =
    useState<any>(null);

  const [messages, setMessages] =
    useState<StudyMsg[]>([]);

  const [input, setInput] =
    useState("");

  const [
    isStreaming,
    setIsStreaming,
  ] = useState(false);

  const [
    streamingText,
    setStreamingText,
  ] = useState("");

  const [
    errorMsg,
    setErrorMsg,
  ] = useState<
    string | null
  >(null);

  /* NOTE */
  const [
    noteOpen,
    setNoteOpen,
  ] = useState(false);

  const bottomRef =
    useRef<HTMLDivElement>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const router = useRouter();

  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    return watchAuthState(nextUser => { setUser(nextUser); setAuthReady(true); });
  }, []);

  /* =========================================================
     CHAT FIRESTORE
  ========================================================= */

  useEffect(() => {
    setMessages([]); setHistoryReady(false);
    if (!user) return;

    const q = query(
      collection(
        db,
        "studyChats",
        user.uid,
        "messages"
      ),
      orderBy(
        "createdAt",
        "asc"
      )
    );

    return onSnapshot(
      q,
      (snap) => {
        setHistoryReady(true);
        setMessages(
          snap.docs.map(
            (d) =>
              ({
                id: d.id,
                ...d.data(),
              } as StudyMsg)
          )
        );
      },
      () => { setErrorMsg("학습 대화를 불러오지 못했어. 연결을 확인하고 새로고침해 줘."); }
    );
  }, [user]);

  /* =========================================================
     AUTO SCROLL
  ========================================================= */

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [
    messages,
    streamingText,
  ]);

  /* =========================================================
     IMAGE
  ========================================================= */

  const reviseMessage = async (id: string, text: string) => {
    if (!user || sendingRef.current) throw new Error("busy");
    const index = messages.findIndex(m => m.id === id && m.role === "user");
    if (index < 0 || messages.length - index > 500) throw new Error("Cannot update this history");
    sendingRef.current = true; setIsStreaming(true); setStreamingText(""); setErrorMsg(null);
    let saved = false;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "studyChats", user.uid, "messages", id), { content: text, edited: true });
      messages.slice(index + 1).forEach(m => batch.delete(doc(db, "studyChats", user.uid, "messages", m.id)));
      await batch.commit(); saved = true;
      const history = mediaHistory([...messages.slice(0, index), { ...messages[index], content: text }]);
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "study", robotName: "학습용 AI", messages: history }) });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || `server ${res.status}`); }
      if (!res.body) throw new Error("empty response");
      const full = await readAIStream(res.body, setStreamingText);
      await addDoc(collection(db, "studyChats", user.uid, "messages"), {  role: "ai", content: full, createdAt: serverTimestamp() });
    } catch (err: any) {
      if (!saved) throw err;
      setErrorMsg(friendlyError(err?.message || ""));
    } finally { sendingRef.current = false; setIsStreaming(false); setStreamingText(""); }
  };

  const send = async () => {
    if ((!input.trim() && !pendingMedia) || mediaBusy || !user || sendingRef.current || !historyReady) return;
    sendingRef.current = true;
    const attached = pendingMedia;
    const userText = input.trim() || (attached?.kind === "video" ? "이 동영상의 대표 장면을 설명해 줘." : "이 사진을 설명해 줘.");
    setInput(""); setErrorMsg(null); setIsStreaming(true); setStreamingText("");
    let userSaved = false;
    try {
      await addDoc(collection(db, "studyChats", user.uid, "messages"), { role: "user", content: userText, ...(attached ? { media: attached } : {}), createdAt: serverTimestamp() });
      userSaved = true; setPendingMedia(null);
      const history = mediaHistory([...messages, { role: "user", content: userText, ...(attached ? { media: attached } : {}) }]);
      const res = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "study", robotName: "학습용 AI", messages: history }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `server ${res.status}`);
      }
      if (!res.body) throw new Error("empty response");
      const full = await readAIStream(res.body, setStreamingText);
      await addDoc(collection(db, "studyChats", user.uid, "messages"), { role: "ai", content: full, createdAt: serverTimestamp() });
    } catch (err: any) {
      if (!userSaved) setInput(userText); setErrorMsg(friendlyError(err?.message || "")); }
    finally { sendingRef.current = false; setIsStreaming(false); setStreamingText(""); }
  };

  /* =========================================================
     CLEAR
  ========================================================= */

  const clearHistory =
    async () => {
      if (
        !user ||
        !confirm(
          "학습 내용을 모두 삭제할까요?"
        )
      )
        return;

      const snap =
        await getDocs(
          collection(
            db,
            "studyChats",
            user.uid,
            "messages"
          )
        );

      await Promise.all(
        snap.docs.map((d) =>
          deleteDoc(d.ref)
        )
      );
    };

  /* =========================================================
     LOGIN
  ========================================================= */

  if (!authReady) return <div role="status" className="fixed inset-0 flex flex-col items-center justify-center bg-white text-sm text-slate-400"><RobotWelcomeArt color="#38bdf8" compact /><p className="mt-5">로그인 정보를 확인하고 있어…</p></div>;
  if (!user) return <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-white text-sm text-slate-500"><RobotWelcomeArt color="#38bdf8" compact /><p>공부 내용을 저장하려면 로그인해 줘.</p><button onClick={() => router.push("/login")} className="rounded-full bg-slate-800 px-6 py-3 text-white">로그인하기</button><button onClick={() => router.back()}>뒤로가기</button></div>;

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background:
          "#ffffff",
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="relative z-20 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white/70 px-3 py-3 backdrop-blur-xl sm:px-4"
        style={{
          boxShadow:
            "0 1px 12px rgba(0,0,0,0.06)",
        }}
      >
        {/* LEFT */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={() =>
              router.back()
            }
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/60 text-gray-500 transition hover:bg-white/90 active:scale-90"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1 truncate text-[14px] font-black text-gray-800 sm:text-[15px]">
              📚 학습용 AI
            </div>

            <div className="mt-0.5 hidden text-[10px] font-medium leading-none text-amber-600 min-[370px]:block">
              줄글 · 형광펜 · 표
              · 체크리스트
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* =====================
              NOTE BUTTON
          ===================== */}

          <button
            onClick={() =>
              setNoteOpen(true)
            }
            className="flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition active:scale-95"
            style={{
              background:
                "#f5f3ff",

              color:
                "#7c3aed",

              borderColor:
                "#ddd6fe",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />

              <polyline points="14 2 14 8 20 8" />

              <line
                x1="8"
                y1="13"
                x2="16"
                y2="13"
              />

              <line
                x1="8"
                y1="17"
                x2="16"
                y2="17"
              />
            </svg>

            노트
          </button>

          {/* CLEAR */}

          <button
            onClick={
              clearHistory
            }
            className="rounded-xl px-2 py-1 text-[11px] text-gray-300 transition hover:bg-red-50 hover:text-red-400"
          >
            지우기
          </button>
        </div>
      </div>

      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      {/* =====================================================
          CHAT CONTENT
      ===================================================== */}

      <div className="relative z-10 min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-8">
        {/* EMPTY */}

        {!historyReady && !errorMsg && <p role="status" className="text-center text-sm text-slate-400">학습 내용을 불러오는 중…</p>}
        {historyReady && messages.length === 0 && !isStreaming && (
          <section className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-2 py-6">
            <RobotWelcomeArt color="#38bdf8" compact />
            <p className="mt-4 text-center text-xs text-slate-400">너의 공부 메이트</p>
            <h1 className="mt-3 text-center text-[28px] font-semibold leading-snug tracking-tight text-slate-800">어디서 막혔어?<br /><span className="relative isolate inline-block"><span aria-hidden="true" className="absolute -bottom-0.5 inset-x-0 -z-10 h-2 rounded-full bg-amber-100 blur-[3px] shadow-[0_0_14px_rgba(253,230,138,0.65)]" />하나씩 같이 풀어보자.</span></h1>
            <p className="mb-6 mt-3 text-center text-sm leading-relaxed text-slate-500">모르는 걸 잘 설명하지 못해도 괜찮아.<br />개념부터 차근차근 짚어 줄게.</p>
            <div className="space-y-2.5">{[
              { title: "이 개념, 쉽게 설명해 줘", sub: "어려운 말 대신 익숙한 예시로", prompt: "이해가 안 되는 개념이 있어. 어떤 개념인지 먼저 물어보고 쉬운 예시로 설명해 줘." },
              { title: "시험 전에 핵심만 정리하자", sub: "비교표와 노트로 한눈에", prompt: "시험 공부를 도와줘. 먼저 과목과 범위를 물어보고 핵심 노트와 비교표로 정리해 줘." },
              { title: "외웠는지 퀴즈 내 줘", sub: "한 문제씩 풀면서 확인하기", prompt: "공부한 내용을 퀴즈로 확인하고 싶어. 먼저 주제를 물어보고 한 문제씩 내 줘." },
            ].map(item => <button key={item.title} onClick={() => { setInput(item.prompt); textareaRef.current?.focus(); }} className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-left shadow-[0_3px_16px_-10px_rgba(51,65,85,0.2)] transition hover:bg-slate-50"><span className="block text-sm font-medium text-slate-700">{item.title}</span><span className="mt-1 block text-xs text-slate-400">{item.sub}</span></button>)}</div>
          </section>
        )}

        {/* MESSAGES */}

        {messages.map(
          (msg) => (
            <div key={msg.id} className="mx-auto w-full max-w-2xl">
              {msg.role ===
              "user" ? (
                <AIUserMessage content={msg.content} media={msg.media} disabled={isStreaming || mediaBusy} onSave={text => reviseMessage(msg.id, text)} onDelete={async () => { await deleteDoc(doc(db, "studyChats", user.uid, "messages", msg.id)); }} />
              ) : (
                <div
                  className="mx-auto w-full max-w-2xl py-4"
                  style={{
                    boxShadow:
                      "none",
                  }}
                >
                  <div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-400"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sky-300" />학습용 AI</div>

                  <RichContent
                    text={
                      msg.content
                    }
                  />
                </div>
              )}
            </div>
          )
        )}

        {/* STREAMING */}

        {isStreaming && (
          <div
            className="mx-auto w-full max-w-2xl py-4"
            style={{
              boxShadow:
                "none",
            }}
          >
            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-400"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sky-300" />학습용 AI</div>

            {streamingText ? (
              <>
                <RichContent
                  text={
                    streamingText
                  }
                />

                <span
                  className="ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full align-middle"
                  style={{
                    background:
                      "#64748b",
                  }}
                />
              </>
            ) : (
              <div className="flex items-center gap-1 py-1">
                {[
                  0,
                  150,
                  300,
                ].map((d) => (
                  <span
                    key={d}
                    className="h-2 w-2 animate-bounce rounded-full"
                    style={{
                      background:
                        "#94a3b8",

                      animationDelay: `${d}ms`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div
          ref={bottomRef}
          className="h-1"
        />
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {errorMsg && (
        <div className="z-10 mx-4 mb-2 flex shrink-0 items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5">
          <span className="text-xs leading-snug text-red-600">
            ⚠️ {errorMsg}
          </span>

          <button
            onClick={() =>
              setErrorMsg(null)
            }
            className="ml-2 shrink-0 text-sm font-bold text-red-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* =====================================================
          IMAGE PREVIEW
      ===================================================== */}

      <div className="mx-auto w-full max-w-2xl px-4">{pendingMedia && <AIMediaPreview media={pendingMedia} onRemove={isStreaming ? undefined : () => setPendingMedia(null)} />}{mediaBusy && <p role="status" className="pb-2 text-xs text-slate-400">첨부를 준비하고 있어…</p>}</div>
      {/* =====================================================
          INPUT
      ===================================================== */}

      <div className="z-10 shrink-0 px-4 pb-5 pt-1.5">
        <div
          className="mx-auto max-w-2xl flex items-end gap-2.5 rounded-[28px] px-4 py-3 transition-all"
          style={{
            background:
              "rgba(255,255,255,0.82)",

            backdropFilter:
              "blur(24px)",

            WebkitBackdropFilter:
              "blur(24px)",

            border:
              "1.5px solid rgba(226,232,240,0.7)",

            boxShadow:
              "0 8px 32px rgba(0,0,0,0.07), inset 0 1px 0 white",
          }}
        >
          <AIMediaPicker disabled={isStreaming || mediaBusy || !historyReady} onChange={setPendingMedia} onBusy={setMediaBusy} onError={setErrorMsg} />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) =>
              setInput(
                e.target.value
              )
            }
            onKeyDown={(e) => {
              if (
                e.key ===
                  "Enter" &&
                !e.shiftKey && !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              isStreaming
                ? "정리 중이야..."
                : "공부할 내용을 적어봐 (예: 세포분열 정리해 줘)"
            }
            disabled={
              isStreaming
            }
            rows={2}
            className="min-w-0 flex-1 resize-none bg-transparent text-[13.5px] font-medium leading-relaxed text-gray-700 outline-none placeholder:text-gray-400 disabled:opacity-50"
          />

          <button
            onClick={send}
            disabled={
              isStreaming || mediaBusy || !historyReady ||
              (!input.trim() && !pendingMedia)
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-40"
            style={{
              background:
                "#334155",

              boxShadow:
                "0 4px 16px rgba(51,65,85,0.15)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line
                x1="22"
                y1="2"
                x2="11"
                y2="13"
              />

              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

        <p className="mt-1.5 text-center text-[10px] text-gray-300">
          Enter → 전송 ·
          Shift+Enter → 줄바꿈
        </p>
      </div>

      {/* =====================================================
          NOTE
      ===================================================== */}

      <NoteDrawer
        open={noteOpen}
        onClose={() =>
          setNoteOpen(false)
        }
      />
    </div>
  );
}