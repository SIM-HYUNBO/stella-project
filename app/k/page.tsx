"use client";
import React, { useState, useEffect } from "react";

interface Note {
  id: number;
  content: string;
}

const LinedNotepad: React.FC = () => {
  const [text, setText] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // 저장된 메모 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("myNotes");
    if (saved) {
      setNotes(JSON.parse(saved));
    }
  }, []);

  // 메모 저장
  const handleSave = () => {
    if (selectedId !== null) {
      // 기존 메모 수정
      const updated = notes.map((note) =>
        note.id === selectedId ? { ...note, content: text } : note
      );
      setNotes(updated);
      localStorage.setItem("myNotes", JSON.stringify(updated));
      alert("메모가 수정되었습니다!");
    } else {
      // 새 메모 추가
      const newNote: Note = { id: Date.now(), content: text };
      const updated = [...notes, newNote];
      setNotes(updated);
      localStorage.setItem("myNotes", JSON.stringify(updated));
      alert("새 메모가 저장되었습니다!");
    }
    setText("");
    setSelectedId(null);
  };

  // 메모 선택
  const handleSelect = (id: number) => {
    const note = notes.find((n) => n.id === id);
    if (note) {
      setText(note.content);
      setSelectedId(id);
    }
  };

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px" }}>
      {/* 메모장 */}
      <div
        style={{
          width: "600px",
          height: "800px",
          border: "1px solid #ccc",
          backgroundColor: "white",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 줄 배경 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 40,
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent, transparent 18px, #ddd 19px)",
            pointerEvents: "none",
          }}
        />

        {/* 입력창 */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            resize: "none",
            background: "transparent",
            fontSize: "16px",
            lineHeight: "20px",
            padding: "10px",
            boxSizing: "border-box",
            position: "relative",
          }}
          placeholder="여기에 내용을 입력하세요..."
        />

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          style={{
            height: "40px",
            border: "none",
            backgroundColor: "#ffa9a9",
            color: "white",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          {selectedId ? "수정하기" : "저장하기"}
        </button>
      </div>

      {/* 목록 보기 */}
      <div style={{ width: "250px" }}>
        <h3>메모 목록</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {notes.map((note) => (
            <li
              key={note.id}
              style={{
                border: "1px solid #ccc",
                padding: "10px",
                marginBottom: "10px",
                cursor: "pointer",
                backgroundColor: note.id === selectedId ? "#fcffbe" : "white",
              }}
              onClick={() => handleSelect(note.id)}
            >
              {note.content.slice(0, 20)}...
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LinedNotepad;