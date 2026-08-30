"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    showSaveFilePicker?: (options?: any) => Promise<any>;
    showOpenFilePicker?: (options?: any) => Promise<any[]>;
  }
}

export default function NotePage() {
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");

  const [fileName, setFileName] = useState("study-note.md");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  /*
   * PC에서 한번 저장한 파일 핸들을 기억.
   * 다음 저장부터는 같은 파일에 덮어쓰기.
   */
  const fileHandleRef = useRef<any>(null);

  /* =========================================================
     MARKDOWN 생성
  ========================================================= */

  const makeMarkdown = () => {
    const safeTopic = topic.trim() || "공부 노트";

    return `# ${safeTopic}

${content}
`;
  };

  /* =========================================================
     PC FILE SAVE
  ========================================================= */

  const saveWithFilePicker = async () => {
    try {
      setSaving(true);

      /*
       * 처음 저장하는 경우에만
       * 저장할 파일을 선택한다.
       */
      if (!fileHandleRef.current) {
        const handle = await window.showSaveFilePicker?.({
          suggestedName: fileName || "study-note.md",

          types: [
            {
              description: "Markdown 문서",
              accept: {
                "text/markdown": [".md"],
                "text/plain": [".txt"],
              },
            },
          ],
        });

        if (!handle) return;

        fileHandleRef.current = handle;

        setFileName(handle.name);
      }

      const writable =
        await fileHandleRef.current.createWritable();

      await writable.write(makeMarkdown());

      await writable.close();

      showSaved();
    } catch (error: any) {
      /*
       * 사용자가 저장창에서 취소한 경우
       */
      if (error?.name === "AbortError") {
        return;
      }

      console.error(error);

      /*
       * File System API 실패 시
       * 일반 다운로드 방식 사용
       */
      downloadFile();
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     MOBILE / FALLBACK DOWNLOAD
  ========================================================= */

  const downloadFile = () => {
    const markdown = makeMarkdown();

    const blob = new Blob([markdown], {
      type: "text/markdown;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download =
      fileName.trim() || "study-note.md";

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);

    showSaved();
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const saveFile = async () => {
    /*
     * PC Chrome / Edge 등
     */
    if (window.showSaveFilePicker) {
      await saveWithFilePicker();

      return;
    }

    /*
     * iPhone / Android 등의 모바일
     */
    downloadFile();
  };

  /* =========================================================
     SAVE AS
  ========================================================= */

  const saveAsFile = async () => {
    /*
     * 기존 파일 핸들을 없애면
     * 다시 저장 위치 선택창이 뜬다.
     */
    fileHandleRef.current = null;

    await saveFile();
  };

  /* =========================================================
     FILE OPEN
  ========================================================= */

  const openFile = async () => {
    /*
     * PC Chrome / Edge
     */
    if (window.showOpenFilePicker) {
      try {
        const handles =
          await window.showOpenFilePicker({
            multiple: false,

            types: [
              {
                description: "공부 노트",
                accept: {
                  "text/markdown": [".md"],
                  "text/plain": [".txt"],
                },
              },
            ],
          });

        const handle = handles[0];

        if (!handle) return;

        const file = await handle.getFile();

        const text = await file.text();

        fileHandleRef.current = handle;

        setFileName(file.name);

        parseMarkdown(text);

        return;
      } catch (error: any) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error(error);
      }
    }

    /*
     * 모바일 / Safari fallback
     */
    document
      .getElementById("note-file-input")
      ?.click();
  };

  /* =========================================================
     MOBILE FILE OPEN
  ========================================================= */

  const handleFileInput = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const text = await file.text();

    setFileName(file.name);

    fileHandleRef.current = null;

    parseMarkdown(text);

    e.target.value = "";
  };

  /* =========================================================
     MARKDOWN 읽기
  ========================================================= */

  const parseMarkdown = (text: string) => {
    const lines = text.split("\n");

    /*
     * 첫 번째 "# 제목"을 공부 주제로 사용
     */
    const firstHeadingIndex =
      lines.findIndex((line) =>
        line.trim().startsWith("# ")
      );

    if (firstHeadingIndex !== -1) {
      const title = lines[
        firstHeadingIndex
      ]
        .trim()
        .replace(/^#\s+/, "");

      setTopic(title);

      const rest = [
        ...lines.slice(
          0,
          firstHeadingIndex
        ),
        ...lines.slice(
          firstHeadingIndex + 1
        ),
      ]
        .join("\n")
        .trim();

      setContent(rest);
    } else {
      setTopic("");

      setContent(text);
    }
  };

  /* =========================================================
     NEW
  ========================================================= */

  const newNote = () => {
    if (
      (topic.trim() ||
        content.trim()) &&
      !confirm(
        "현재 내용을 지우고 새 노트를 만들까요?"
      )
    ) {
      return;
    }

    setTopic("");

    setContent("");

    setFileName("study-note.md");

    fileHandleRef.current = null;
  };

  /* =========================================================
     SAVED MESSAGE
  ========================================================= */

  const showSaved = () => {
    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 1800);
  };

  /* =========================================================
     CTRL + S
  ========================================================= */

  useEffect(() => {
    const handleKeyDown = (
      e: KeyboardEvent
    ) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "s"
      ) {
        e.preventDefault();

        saveFile();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [topic, content, fileName]);

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#fcfbff] text-gray-800">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="flex shrink-0 items-center justify-between border-b border-violet-100 bg-white/90 px-4 py-3 backdrop-blur-xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-lg">
              📝
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-black text-gray-800">
                공부 노트
              </h1>

              <p className="truncate text-[10px] font-medium text-violet-500">
                {fileName}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {saved && (
            <span className="hidden text-[11px] font-bold text-emerald-500 sm:inline">
              저장됨 ✓
            </span>
          )}

          {/* 열기 */}
          <button
            onClick={openFile}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-500 transition hover:bg-gray-50 active:scale-95"
          >
            열기
          </button>

          {/* 저장 */}
          <button
            onClick={saveFile}
            disabled={saving}
            className="rounded-xl bg-violet-600 px-3.5 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-violet-700 active:scale-95 disabled:opacity-50"
          >
            {saving
              ? "저장 중"
              : "저장"}
          </button>
        </div>
      </header>

      {/* 모바일 파일 선택 */}
      <input
        id="note-file-input"
        type="file"
        accept=".md,.txt,text/plain,text/markdown"
        hidden
        onChange={
          handleFileInput
        }
      />

      {/* =====================================================
          TOOLBAR
      ===================================================== */}

      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-violet-100/70 bg-white/60 px-4 py-2">
        <button
          onClick={newNote}
          className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-gray-500 transition hover:bg-violet-50 hover:text-violet-600"
        >
          ＋ 새 노트
        </button>

        <button
          onClick={saveAsFile}
          className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-gray-500 transition hover:bg-violet-50 hover:text-violet-600"
        >
          다른 이름으로 저장
        </button>

        <div className="mx-1 h-4 w-px bg-gray-200" />

        <span className="whitespace-nowrap text-[10px] text-gray-300">
          Ctrl + S 저장
        </span>
      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-5 py-7 sm:px-8 md:px-10">
          {/* TOPIC */}

          <div className="mb-5">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
              STUDY TOPIC
            </div>

            <input
              value={topic}
              onChange={(e) =>
                setTopic(
                  e.target.value
                )
              }
              placeholder="공부할 주제를 입력하세요"
              className="w-full border-none bg-transparent text-2xl font-black tracking-tight text-gray-800 outline-none placeholder:text-gray-300 sm:text-3xl"
            />
          </div>

          <div className="mb-5 h-px bg-gradient-to-r from-violet-200 via-violet-100 to-transparent" />

          {/* NOTE */}

          <textarea
            value={content}
            onChange={(e) =>
              setContent(
                e.target.value
              )
            }
            placeholder={`공부한 내용을 자유롭게 적어보세요.

예)

## 핵심 개념

- 중요한 내용
- 기억해야 할 내용

## 내가 이해한 것

여기에 직접 설명해 보세요.

## 복습할 내용

- [ ] 다시 볼 내용
- [ ] 문제 풀어보기`}
            spellCheck={false}
            className="
              min-h-[calc(100dvh-220px)]
              w-full
              flex-1
              resize-none
              border-none
              bg-transparent
              text-[14px]
              font-medium
              leading-[2]
              text-gray-700
              outline-none
              placeholder:text-gray-300
              sm:text-[15px]
            "
          />
        </div>
      </main>

      {/* =====================================================
          BOTTOM STATUS
      ===================================================== */}

      <footer className="flex shrink-0 items-center justify-between border-t border-violet-100 bg-white/80 px-4 py-2 text-[10px] text-gray-400 backdrop-blur">
        <span>
          {content.length.toLocaleString()}자
        </span>

        <div className="flex items-center gap-2">
          {saved && (
            <span className="font-bold text-emerald-500 sm:hidden">
              ✓ 파일 저장됨
            </span>
          )}

          <span>Markdown</span>
        </div>
      </footer>
    </div>
  );
}