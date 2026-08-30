"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";

import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  deleteDoc,
} from "firebase/firestore";

/* =========================================================
   TYPE
========================================================= */

type StudyMsg = {
  id: string;
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
    const minMatch = msg.match(/try again in (\d+)m/i);

    return minMatch
      ? `오늘 AI 사용량이 꽉 찼어. 약 ${minMatch[1]}분 후에 다시 해봐 🕐`
      : "오늘 AI 사용량이 꽉 찼어. 잠시 후에 다시 해봐 🕐";
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
  const parts = text.split(/(\[\[.*?\]\])/g);

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
          <span key={i}>{p}</span>
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
    <div className="my-3 overflow-x-auto rounded-xl border border-amber-200 shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {header.map((h, i) => (
              <th
                key={i}
                className="whitespace-nowrap border-b border-amber-200 bg-amber-50 px-3 py-2 text-left font-bold text-amber-800"
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
                  className="border-b border-amber-100 px-3 py-2 align-top text-gray-700"
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
          className="mb-1.5 mt-4 text-[15px] font-black text-gray-800"
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
          className="mb-2 mt-5 text-[17px] font-black text-amber-800"
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
              className="flex items-start gap-2 text-sm text-gray-700"
            >
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />

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
        className="my-1.5 text-[13.5px] leading-[1.85] text-gray-700"
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

  const [
    pendingImages,
    setPendingImages,
  ] = useState<string[]>([]);

  /* NOTE */
  const [
    noteOpen,
    setNoteOpen,
  ] = useState(false);

  const bottomRef =
    useRef<HTMLDivElement>(null);

  const fileRef =
    useRef<HTMLInputElement>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const router = useRouter();

  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    return watchAuthState(setUser);
  }, []);

  /* =========================================================
     CHAT FIRESTORE
  ========================================================= */

  useEffect(() => {
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
        setMessages(
          snap.docs.map(
            (d) =>
              ({
                id: d.id,
                ...d.data(),
              } as StudyMsg)
          )
        );
      }
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

  const uploadImages = (
    files: FileList | null
  ) => {
    if (!files) return;

    setPendingImages(
      (prev) => [
        ...prev,
        ...Array.from(
          files
        ).map((f) =>
          URL.createObjectURL(f)
        ),
      ]
    );
  };

  const removeImage = (
    idx: number
  ) => {
    setPendingImages(
      (prev) =>
        prev.filter(
          (_, i) => i !== idx
        )
    );
  };

  /* =========================================================
     SEND
  ========================================================= */

  const send = async () => {
    if (
      !input.trim() ||
      !user ||
      isStreaming
    )
      return;

    const userText =
      input.trim();

    setInput("");
    setErrorMsg(null);
    setPendingImages([]);

    await addDoc(
      collection(
        db,
        "studyChats",
        user.uid,
        "messages"
      ),
      {
        role: "user",
        content: userText,
        createdAt:
          serverTimestamp(),
      }
    );

    const history =
      messages.map((m) => ({
        role:
          m.role === "ai"
            ? "assistant"
            : "user",

        content: m.content,
      }));

    history.push({
      role: "user",
      content: userText,
    });

    setIsStreaming(true);
    setStreamingText("");

    try {
      const res =
        await fetch(
          "/api/ai",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              mode: "study",

              robotName:
                "학습용 AI",

              messages:
                history,
            }),
          }
        );

      if (
        !res.ok ||
        !res.body
      ) {
        const d =
          await res
            .json()
            .catch(() => ({}));

        throw new Error(
          d.error ||
            "응답 실패"
        );
      }

      const reader =
        res.body.getReader();

      const decoder =
        new TextDecoder();

      let full = "";

      while (true) {
        const {
          done,
          value,
        } =
          await reader.read();

        if (done) break;

        const chunk =
          decoder.decode(
            value,
            {
              stream: true,
            }
          );

        for (const line of chunk.split(
          "\n"
        )) {
          if (
            !line.startsWith(
              "data: "
            )
          )
            continue;

          const raw =
            line
              .slice(6)
              .trim();

          if (
            raw === "[DONE]"
          )
            break;

          try {
            const delta =
              JSON.parse(raw)
                .choices?.[0]
                ?.delta
                ?.content;

            if (delta) {
              full += delta;

              setStreamingText(
                full
              );
            }
          } catch {}
        }
      }

      await addDoc(
        collection(
          db,
          "studyChats",
          user.uid,
          "messages"
        ),
        {
          role: "ai",

          content:
            full || "...",

          createdAt:
            serverTimestamp(),
        }
      );
    } catch (err: any) {
      setErrorMsg(
        friendlyError(
          err?.message || ""
        )
      );
    } finally {
      setIsStreaming(false);
      setStreamingText("");
    }
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

  if (!user)
    return (
      <div
        className="fixed inset-0 flex items-center justify-center text-sm text-gray-400"
        style={{
          background:
            "linear-gradient(160deg, #fffbeb 0%, #f0fdf4 100%)",
        }}
      >
        로그인이 필요해요.
      </div>
    );

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, #fffbeb 0%, #f0fdf4 100%)",
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="relative z-20 flex shrink-0 items-center justify-between border-b border-amber-100/80 bg-white/70 px-3 py-3 backdrop-blur-xl sm:px-4"
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

          {/* IMAGE */}

          <button
            onClick={() =>
              fileRef.current?.click()
            }
            className="hidden items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition active:scale-95 min-[430px]:flex"
            style={{
              background:
                "#fffbeb",

              color:
                "#b45309",

              borderColor:
                "#fcd34d80",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />

              <polyline points="17 8 12 3 7 8" />

              <line
                x1="12"
                y1="3"
                x2="12"
                y2="15"
              />
            </svg>

            이미지
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) =>
              uploadImages(
                e.target.files
              )
            }
          />

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

      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute -left-10 -top-10 h-48 w-48 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "#fde68a",
          }}
        />

        <div
          className="absolute -right-12 top-1/2 h-40 w-40 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "#a7f3d0",
          }}
        />

        <div
          className="absolute -bottom-8 left-1/4 h-36 w-36 rounded-full opacity-25 blur-3xl"
          style={{
            background:
              "#fde68a",
          }}
        />
      </div>

      {/* =====================================================
          CHAT CONTENT
      ===================================================== */}

      <div className="relative z-10 flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {/* EMPTY */}

        {messages.length ===
          0 &&
          !isStreaming && (
            <div className="pointer-events-none flex h-full flex-col items-center justify-center gap-4 py-20 text-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-[1.8rem] text-4xl shadow-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #fde68a, #a7f3d0)",

                  boxShadow:
                    "0 8px 30px rgba(251,191,36,0.28)",
                }}
              >
                📚
              </div>

              <div>
                <p className="text-base font-black text-gray-700">
                  학습용 AI와 공부
                  시작!
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  표 · 체크리스트
                  · 단어장 ·
                  노트로 정리해줄게
                </p>

                <button
                  onClick={() =>
                    setNoteOpen(
                      true
                    )
                  }
                  className="pointer-events-auto mt-5 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-bold text-violet-600 transition hover:bg-violet-100 active:scale-95"
                >
                  📝 공부 노트 열기
                </button>
              </div>
            </div>
          )}

        {/* MESSAGES */}

        {messages.map(
          (msg) => (
            <div key={msg.id}>
              {msg.role ===
              "user" ? (
                <div className="flex justify-end">
                  <div
                    className="inline-flex max-w-[85%] items-start gap-1.5 rounded-2xl rounded-br-md px-4 py-2.5 text-sm font-semibold text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, #f59e0b, #84cc16)",

                      boxShadow:
                        "0 4px 16px rgba(245,158,11,0.28)",
                    }}
                  >
                    <span className="mt-0.5">
                      🙋
                    </span>

                    <span>
                      {
                        msg.content
                      }
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-2xl border border-amber-100 bg-white/90 px-5 py-4"
                  style={{
                    boxShadow:
                      "0 2px 16px rgba(120,84,20,0.07)",
                  }}
                >
                  <div className="mb-3 flex items-center gap-1 text-[10px] font-bold text-amber-500">
                    <span>
                      📚
                    </span>

                    학습용 AI
                  </div>

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
            className="rounded-2xl border border-amber-100 bg-white/90 px-5 py-4"
            style={{
              boxShadow:
                "0 2px 16px rgba(120,84,20,0.07)",
            }}
          >
            <div className="mb-3 flex items-center gap-1 text-[10px] font-bold text-amber-500">
              <span>
                📚
              </span>

              학습용 AI
            </div>

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
                      "#f59e0b",
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
                        "#fcd34d",

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

      {pendingImages.length >
        0 && (
        <div className="z-10 flex shrink-0 gap-2 overflow-x-auto px-4 pb-1.5">
          {pendingImages.map(
            (src, i) => (
              <div
                key={i}
                className="relative shrink-0"
              >
                <img
                  src={src}
                  alt=""
                  className="h-14 w-14 rounded-xl border-2 border-amber-200 object-cover"
                />

                <button
                  onClick={() =>
                    removeImage(
                      i
                    )
                  }
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-400 text-[10px] font-bold text-white"
                >
                  ✕
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* =====================================================
          INPUT
      ===================================================== */}

      <div className="z-10 shrink-0 px-4 pb-5 pt-1.5">
        <div
          className="flex items-end gap-2.5 rounded-3xl px-4 py-3 transition-all"
          style={{
            background:
              "rgba(255,255,255,0.82)",

            backdropFilter:
              "blur(24px)",

            WebkitBackdropFilter:
              "blur(24px)",

            border:
              "1.5px solid rgba(251,191,36,0.45)",

            boxShadow:
              "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(251,191,36,0.2)",
          }}
        >
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
                !e.shiftKey
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
            className="flex-1 resize-none bg-transparent text-[13.5px] font-medium leading-relaxed text-gray-700 outline-none placeholder:text-gray-400 disabled:opacity-50"
          />

          <button
            onClick={send}
            disabled={
              isStreaming ||
              !input.trim()
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-40"
            style={{
              background:
                "linear-gradient(135deg, #f59e0b, #84cc16)",

              boxShadow:
                "0 4px 16px rgba(245,158,11,0.35)",
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