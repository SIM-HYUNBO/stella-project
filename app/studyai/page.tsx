"use client";

import { useRef, useState } from "react";

type StudyBlock =
  | { type: "paragraph"; text: string }
  | { type: "note"; title: string; content: string };

export default function StudyAiPanel() {
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<StudyBlock[]>([
    {
      type: "paragraph",
      text: "학습용 AI 모드입니다. 말풍선 없이 줄글로 설명하고, 중요한 단어나 어구는 [[형광펜 밑줄]]로 표시됩니다.",
    },
  ]);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  const fileRef = useRef<HTMLInputElement | null>(null);

  const uploadImages = (files: FileList | null) => {
    if (!files) return;
    const urls = Array.from(files).map((file) => URL.createObjectURL(file));
    setImages((prev) => [...prev, ...urls]);
  };

  const streamStudyAI = async (
    userText: string,
    onChunk: (text: string) => void
  ) => {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "study",
        robotName: "학습용 AI",
        messages: [
          {
            role: "user",
            content: userText,
          },
        ],
      }),
    });

  if (!res.ok || !res.body) {
  const text = await res.text().catch(() => "");
  throw new Error(text || "학습용 AI 응답 실패");
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
          if (delta) {
            full += delta;
            onChunk(full);
          }
        } catch {}
      }
    }

    return full;
  };

  const makeStudyAnswer = async () => {
    if (!input.trim() || isStreaming) return;

    const userText = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamingText("");

    try {
      const full = await streamStudyAI(userText, setStreamingText);

      setBlocks((prev) => [
        ...prev,
        {
          type: "paragraph",
          text: full || "응답이 비어 있어.",
        },
      ]);
    } catch (err: any) {
      setBlocks((prev) => [
        ...prev,
        {
          type: "paragraph",
          text: `오류: ${err?.message || "알 수 없는 오류"}`,
        },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingText("");
    }
  };

  return (
    <section className="studyAi">
      <div className="studyHeader">
        <div>
          <h2>학습용 AI</h2>
          <p>줄글 설명 · 형광펜 밑줄 · 이미지 업로드 · 체크리스트 · 표 · 단어장 · 노트</p>
        </div>

        <button onClick={() => fileRef.current?.click()}>
          이미지 올리기
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => uploadImages(e.target.files)}
        />
      </div>

      {images.length > 0 && (
        <div className="imageGrid">
          {images.map((src, index) => (
            <img key={index} src={src} alt={`study-upload-${index}`} />
          ))}
        </div>
      )}

      <article className="studyPaper">
        {blocks.map((block, index) => (
          <StudyBlockRenderer key={index} block={block} />
        ))}

        {isStreaming && (
          <p className="paragraph streaming">
            {renderHighlight(streamingText || "학습 정리 만드는 중...")}
            <span className="cursor" />
          </p>
        )}
      </article>

      <div className="studyInput">
        <textarea
          value={input}
          disabled={isStreaming}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              makeStudyAnswer();
            }
          }}
          placeholder="공부할 내용을 입력해 줘. 예: 세포분열 정리해 줘"
        />

        <button onClick={makeStudyAnswer} disabled={isStreaming}>
          {isStreaming ? "정리 중..." : "학습 정리 만들기"}
        </button>
      </div>

      <style jsx>{`
        .studyAi {
          min-height: 100vh;
          padding: 32px;
          background:
            radial-gradient(circle at top left, #fff3bf 0, transparent 32%),
            linear-gradient(135deg, #f8f1df, #eef6e8);
          color: #1f2937;
        }

        .studyHeader {
          max-width: 980px;
          margin: 0 auto 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        h2 {
          margin: 0;
          font-size: 32px;
        }

        p {
          margin: 8px 0 0;
          color: #6b7280;
        }

        button {
          border: none;
          border-radius: 18px;
          padding: 14px 18px;
          background: #92400e;
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .imageGrid {
          max-width: 980px;
          margin: 0 auto 20px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        }

        .imageGrid img {
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 18px;
          border: 3px solid #fef3c7;
        }

        .studyPaper {
          max-width: 980px;
          min-height: 520px;
          margin: 0 auto;
          padding: 32px;
          background: #fffdf4;
          border: 1px solid #ead7a4;
          border-radius: 28px;
          line-height: 1.85;
          box-shadow: 0 20px 60px rgba(120, 84, 20, 0.14);
          white-space: pre-wrap;
        }

        .studyInput {
          max-width: 980px;
          margin: 20px auto 0;
          display: flex;
          gap: 12px;
        }

        textarea {
          flex: 1;
          min-height: 90px;
          resize: vertical;
          border: 1px solid #d6c08d;
          border-radius: 18px;
          padding: 16px;
          font-size: 15px;
          outline: none;
          background: #fffef9;
        }

        .studyInput button {
          background: #ca8a04;
        }

        .streaming {
          opacity: 0.9;
        }

        .cursor {
          display: inline-block;
          width: 3px;
          height: 1em;
          margin-left: 3px;
          background: #ca8a04;
          border-radius: 999px;
          vertical-align: middle;
          animation: blink 0.8s infinite;
        }

        @keyframes blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        @media (max-width: 720px) {
          .studyAi {
            padding: 18px;
          }

          .studyHeader {
            flex-direction: column;
            align-items: stretch;
          }

          .studyInput {
            flex-direction: column;
          }

          .studyPaper {
            padding: 22px;
          }
        }
      `}</style>
    </section>
  );
}

function StudyBlockRenderer({ block }: { block: StudyBlock }) {
  if (block.type === "paragraph") {
    return <p className="paragraph">{renderHighlight(block.text)}</p>;
  }

  return (
    <section className="note">
      <h3>{block.title}</h3>
      <p>{renderHighlight(block.content)}</p>

      <style jsx>{shared}</style>
    </section>
  );
}

function renderHighlight(text: string) {
  const parts = text.split(/(\[\[.*?\]\])/g);

  return parts.map((part, index) => {
    if (part.startsWith("[[") && part.endsWith("]]")) {
      return <mark key={index}>{part.replace("[[", "").replace("]]", "")}</mark>;
    }

    return part;
  });
}

const shared = `
  .note {
    margin: 26px 0;
    padding: 20px;
    border-radius: 20px;
    background: #fef3c7;
    border: 1px solid #f3d98b;
  }

  h3 {
    margin: 0 0 14px;
    font-size: 20px;
    color: #78350f;
  }

  mark {
    background: linear-gradient(transparent 58%, #fde047 58%);
    padding: 0 3px;
    border-radius: 4px;
  }

  .paragraph {
    font-size: 17px;
    margin: 0 0 20px;
  }
`;