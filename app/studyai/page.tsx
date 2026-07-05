"use client";

import { useRef, useState } from "react";

type StudyBlock =
  | { type: "paragraph"; text: string }
  | { type: "checklist"; title: string; items: string[] }
  | { type: "table"; title: string; headers: string[]; rows: string[][] }
  | { type: "vocab"; title: string; words: { word: string; meaning: string }[] }
  | { type: "note"; title: string; content: string };

export default function StudyAiPanel() {
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [blocks, setBlocks] = useState<StudyBlock[]>([
    {
      type: "paragraph",
      text: "학습용 AI 모드입니다. 말풍선 없이 줄글로 설명하고, 중요한 단어나 어구는 [[형광펜 밑줄]]로 표시됩니다.",
    },
  ]);

  const uploadImages = (files: FileList | null) => {
    if (!files) return;
    const urls = Array.from(files).map((file) => URL.createObjectURL(file));
    setImages((prev) => [...prev, ...urls]);
  };

  const makeStudyAnswer = () => {
    if (!input.trim()) return;

    setBlocks((prev) => [
      ...prev,
      {
        type: "paragraph",
        text: `"${input}"에 대해 정리해 줄게. 먼저 [[핵심 개념]]을 잡고, 그다음 [[예시]], [[표 정리]], [[복습 체크]] 순서로 공부하면 좋아.`,
      },
      {
        type: "checklist",
        title: "공부 체크리스트",
        items: [
          "핵심 개념 표시하기",
          "중요 단어 밑줄 긋기",
          "예시 하나 만들기",
          "마지막에 3줄 요약하기",
        ],
      },
      {
        type: "table",
        title: "개념 정리표",
        headers: ["구분", "내용", "중요도"],
        rows: [
          ["주제", input, "높음"],
          ["이해 방법", "개념 → 예시 → 복습 순서로 보기", "높음"],
          ["복습 방법", "체크리스트와 노트로 다시 보기", "중간"],
        ],
      },
      {
        type: "vocab",
        title: "단어장",
        words: [
          { word: "핵심 개념", meaning: "내용을 이해하는 데 가장 중요한 생각" },
          { word: "예시", meaning: "개념을 쉽게 이해하게 해 주는 상황" },
          { word: "복습", meaning: "배운 내용을 다시 확인하는 것" },
        ],
      },
      {
        type: "note",
        title: "노트",
        content:
          "학습용 AI는 개인 AI와 분리해서 사용하면 좋아. 공부 내용만 여기에 쌓이면 나중에 복습하기 편해.",
      },
    ]);

    setInput("");
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
      </article>

      <div className="studyInput">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="공부할 내용을 입력해 줘. 예: 세포분열 정리해 줘"
        />

        <button onClick={makeStudyAnswer}>학습 정리 만들기</button>
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

  if (block.type === "checklist") {
    return (
      <section className="block">
        <h3>{block.title}</h3>
        <ul>
          {block.items.map((item, index) => (
            <li key={index}>
              <input type="checkbox" /> {item}
            </li>
          ))}
        </ul>

        <style jsx>{shared}</style>
      </section>
    );
  }

  if (block.type === "table") {
    return (
      <section className="block">
        <h3>{block.title}</h3>
        <table>
          <thead>
            <tr>
              {block.headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <style jsx>{shared}</style>
      </section>
    );
  }

  if (block.type === "vocab") {
    return (
      <section className="block">
        <h3>{block.title}</h3>
        <div className="vocab">
          {block.words.map((item, index) => (
            <div key={index} className="vocabCard">
              <b>{item.word}</b>
              <span>{item.meaning}</span>
            </div>
          ))}
        </div>

        <style jsx>{shared}</style>
      </section>
    );
  }

  return (
    <section className="note">
      <h3>{block.title}</h3>
      <p>{block.content}</p>

      <style jsx>{shared}</style>
    </section>
  );
}

function renderHighlight(text: string) {
  const parts = text.split(/(\[\[.*?\]\])/g);

  return parts.map((part, index) => {
    if (part.startsWith("[[") && part.endsWith("]]")) {
      return (
        <mark key={index}>
          {part.replace("[[", "").replace("]]", "")}
        </mark>
      );
    }

    return part;
  });
}

const shared = `
  .block,
  .note {
    margin: 26px 0;
    padding: 20px;
    border-radius: 20px;
    background: #fff8dc;
    border: 1px solid #f3d98b;
  }

  h3 {
    margin: 0 0 14px;
    font-size: 20px;
    color: #78350f;
  }

  ul {
    padding-left: 0;
    list-style: none;
  }

  li {
    margin: 10px 0;
  }

  input {
    margin-right: 8px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    overflow: hidden;
    border-radius: 14px;
  }

  th,
  td {
    border: 1px solid #e8cf87;
    padding: 12px;
    text-align: left;
  }

  th {
    background: #fde68a;
  }

  .vocab {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }

  .vocabCard {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px;
    border-radius: 16px;
    background: white;
    border: 1px solid #f3d98b;
  }

  .vocabCard b {
    color: #92400e;
  }

  .vocabCard span {
    color: #4b5563;
  }

  .note {
    background: #fef3c7;
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