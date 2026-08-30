"use client";

import { useEffect, useMemo, useState } from "react";

type StudyNote = {
  id: string;
  title: string;
  content: string;
};

type CheckItem = {
  id: string;
  text: string;
  checked: boolean;
};

export default function StudyPage() {
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");

  const [notes, setNotes] = useState<StudyNote[]>([
    {
      id: "note-1",
      title: "",
      content: "",
    },
  ]);

  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");

  const [saved, setSaved] = useState(false);

  /* =========================
      LOAD
  ========================= */
  useEffect(() => {
    const savedData = localStorage.getItem("study-note-data");

    if (!savedData) return;

    try {
      const data = JSON.parse(savedData);

      setTopic(data.topic ?? "");
      setDescription(data.description ?? "");
      setNotes(
        data.notes?.length
          ? data.notes
          : [
              {
                id: "note-1",
                title: "",
                content: "",
              },
            ]
      );
      setCheckItems(data.checkItems ?? []);
    } catch (error) {
      console.error("저장된 공부 노트를 불러오지 못했습니다.", error);
    }
  }, []);

  /* =========================
      SAVE
  ========================= */
  const saveStudy = () => {
    localStorage.setItem(
      "study-note-data",
      JSON.stringify({
        topic,
        description,
        notes,
        checkItems,
      })
    );

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 1800);
  };

  /* =========================
      NOTE
  ========================= */
  const addNote = () => {
    setNotes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: "",
        content: "",
      },
    ]);
  };

  const updateNote = (
    id: string,
    field: "title" | "content",
    value: string
  ) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? {
              ...note,
              [field]: value,
            }
          : note
      )
    );
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  /* =========================
      CHECK LIST
  ========================= */
  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;

    setCheckItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: newCheckItem.trim(),
        checked: false,
      },
    ]);

    setNewCheckItem("");
  };

  const toggleCheckItem = (id: string) => {
    setCheckItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              checked: !item.checked,
            }
          : item
      )
    );
  };

  const deleteCheckItem = (id: string) => {
    setCheckItems((prev) => prev.filter((item) => item.id !== id));
  };

  /* =========================
      PROGRESS
  ========================= */
  const progress = useMemo(() => {
    if (checkItems.length === 0) return 0;

    const completed = checkItems.filter((item) => item.checked).length;

    return Math.round((completed / checkItems.length) * 100);
  }, [checkItems]);

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-800">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-500">
              Study Note
            </p>

            <h1 className="mt-1 text-xl font-bold text-slate-900">
              나의 공부 노트
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-sm font-medium text-emerald-600">
                저장되었습니다 ✓
              </span>
            )}

            <button
              onClick={saveStudy}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              저장
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
        {/* LEFT */}
        <section className="space-y-6">
          {/* TOPIC */}
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <BookIcon />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
                  Topic
                </p>

                <h2 className="text-lg font-bold text-slate-900">
                  오늘 공부할 주제
                </h2>
              </div>
            </div>

            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: React 상태 관리"
              className="w-full border-none bg-transparent text-3xl font-bold tracking-tight text-slate-900 outline-none placeholder:text-slate-300"
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 주제에서 무엇을 공부할지 간단하게 작성해 보세요."
              className="mt-5 min-h-[90px] w-full resize-none rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600 outline-none transition focus:bg-indigo-50/50"
            />
          </div>

          {/* NOTES */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  공부 노트
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  배운 내용을 자유롭게 정리해 보세요.
                </p>
              </div>

              <button
                onClick={addNote}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <PlusIcon />
                노트 추가
              </button>
            </div>

            <div className="space-y-4">
              {notes.map((note, index) => (
                <article
                  key={note.id}
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="flex-1">
                      <input
                        value={note.title}
                        onChange={(e) =>
                          updateNote(note.id, "title", e.target.value)
                        }
                        placeholder="소제목을 입력하세요"
                        className="w-full bg-transparent text-lg font-bold text-slate-900 outline-none placeholder:text-slate-300"
                      />

                      <textarea
                        value={note.content}
                        onChange={(e) =>
                          updateNote(note.id, "content", e.target.value)
                        }
                        placeholder={`여기에 배운 내용을 작성하세요.

• 핵심 개념
• 이해한 내용
• 예제
• 나중에 다시 볼 내용`}
                        className="mt-4 min-h-[220px] w-full resize-y rounded-2xl bg-slate-50 p-5 text-[15px] leading-8 text-slate-700 outline-none transition focus:bg-indigo-50/40"
                      />
                    </div>

                    {notes.length > 1 && (
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="rounded-lg p-2 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        aria-label="노트 삭제"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <aside className="space-y-5">
          {/* PROGRESS */}
          <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Progress
            </p>

            <div className="mt-4 flex items-end justify-between">
              <span className="text-4xl font-bold">{progress}%</span>

              <span className="text-sm text-slate-400">
                {
                  checkItems.filter((item) => item.checked).length
                }{" "}
                / {checkItems.length}
              </span>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-indigo-400 transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              체크리스트를 완료하며 공부 진행도를 확인할 수 있습니다.
            </p>
          </div>

          {/* CHECK LIST */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
                Checklist
              </p>

              <h3 className="mt-1 text-lg font-bold text-slate-900">
                공부할 내용
              </h3>
            </div>

            <div className="mt-5 flex gap-2">
              <input
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addCheckItem();
                  }
                }}
                placeholder="공부할 내용 추가"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400"
              />

              <button
                onClick={addCheckItem}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white transition hover:bg-indigo-600"
              >
                <PlusIcon />
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {checkItems.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                  공부할 내용을 추가해 보세요.
                </div>
              ) : (
                checkItems.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50"
                  >
                    <button
                      onClick={() => toggleCheckItem(item.id)}
                      className={`flex h-5 w-5 min-w-5 items-center justify-center rounded-md border transition ${
                        item.checked
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {item.checked && <CheckIcon />}
                    </button>

                    <span
                      className={`flex-1 text-sm ${
                        item.checked
                          ? "text-slate-400 line-through"
                          : "text-slate-700"
                      }`}
                    >
                      {item.text}
                    </span>

                    <button
                      onClick={() => deleteCheckItem(item.id)}
                      className="rounded-md p-1 text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* STUDY TIP */}
          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6">
            <div className="flex gap-3">
              <div className="text-xl">💡</div>

              <div>
                <h3 className="font-bold text-amber-900">
                  공부 팁
                </h3>

                <p className="mt-2 text-sm leading-6 text-amber-800/70">
                  내용을 그대로 옮겨 적기보다는 자신이 이해한 표현으로
                  다시 작성하면 훨씬 오래 기억할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

/* =========================
    ICONS
========================= */

function BookIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}