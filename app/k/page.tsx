"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Note { id: number; content: string; }

export default function LinedNotepad() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("myNotes");
    if (saved) setNotes(JSON.parse(saved));
  }, []);

  const handleSave = () => {
    if (selectedId !== null) {
      const updated = notes.map((n) => n.id === selectedId ? { ...n, content: text } : n);
      setNotes(updated);
      localStorage.setItem("myNotes", JSON.stringify(updated));
    } else {
      const updated = [...notes, { id: Date.now(), content: text }];
      setNotes(updated);
      localStorage.setItem("myNotes", JSON.stringify(updated));
    }
    setText(""); setSelectedId(null);
  };

  const handleSelect = (id: number) => {
    const note = notes.find((n) => n.id === id);
    if (note) { setText(note.content); setSelectedId(id); }
  };

  const handleDelete = (id: number) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    localStorage.setItem("myNotes", JSON.stringify(updated));
    if (selectedId === id) { setText(""); setSelectedId(null); }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gray-50" />
      <div className="relative z-10 flex flex-col h-screen">
        <div className="flex items-center h-14 px-4 bg-white sticky top-0 z-20 shrink-0">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-50 text-transparent bg-clip-text bg-gradient-to-br from-sky-500 to-cyan-400 font-bold text-lg mr-3">←</button>
          <span className="font-black text-slate-800 text-base">📝 메모장</span>
        </div>

        <div className="flex flex-1 overflow-hidden gap-3 p-4">
          {/* 작성 영역 */}
          <div className="flex-1 flex flex-col rounded-[24px] bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-sky-50 flex items-center gap-2">
              <span className="text-lg">✏️</span>
              <p className="font-black text-slate-800 text-sm">{selectedId ? "메모 수정" : "새 메모"}</p>
              {selectedId && (
                <button onClick={() => { setText(""); setSelectedId(null); }}
                  className="ml-auto text-xs text-transparent bg-clip-text bg-gradient-to-br from-sky-500 to-cyan-400 font-semibold">취소</button>
              )}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 leading-7"
              style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, rgba(56,189,248,0.08) 28px)" }}
              placeholder="여기에 내용을 입력하세요..." />
            <button onClick={handleSave}
              className="mx-4 mb-4 h-12 rounded-[16px] bg-sky-100 text-white font-black text-sm active:scale-[0.98] transition-transform">
              {selectedId ? "수정하기 ✓" : "저장하기 💾"}
            </button>
          </div>

          {/* 목록 */}
          <div className="w-40 flex flex-col gap-2 overflow-y-auto">
            <p className="font-black text-slate-800 text-xs px-1 mb-1">메모 목록</p>
            {notes.length === 0 && <p className="text-slate-400 text-xs text-center py-4">아직 없어요</p>}
            {notes.map((note) => (
              <div key={note.id}
                className={`rounded-[16px] border px-3 py-3 cursor-pointer transition-all ${note.id === selectedId ? "bg-sky-100 border-transparent" : "bg-white/80 border-sky-100"}`}
                onClick={() => handleSelect(note.id)}>
                <p className={`text-xs font-semibold truncate ${note.id === selectedId ? "text-white" : "text-slate-800"}`}>
                  {note.content.slice(0, 20) || "빈 메모"}
                </p>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                  className={`text-[10px] mt-1 font-bold ${note.id === selectedId ? "text-white/70" : "text-red-300"}`}>삭제</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
