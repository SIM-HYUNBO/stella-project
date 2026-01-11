"use client";

import { useState, useEffect } from "react";
import PageContainer from "/components/PageContainer";
import { CenterSpinner } from "/components/CenterSpinner";
import HamburgerMenu from "/components/hamburger";

function Contact() {
  const [loading, setLoading] = useState(true);
  const colors = ["#FFFA65", "#FFD966", "#FFB6B9", "#B0E0E6", "#C1FFC1"];
  const [notes, setNotes] = useState([]);

  // 로컬스토리지에서 노트 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("myNotes");
    if (saved) setNotes(JSON.parse(saved));

    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, [setNotes]);

  // 노트 저장
  useEffect(() => {
    localStorage.setItem("myNotes", JSON.stringify(notes));
  }, [notes]);

  function addNote() {
    const newNote = {
      id: Date.now(),
      text: "",
      color: colors[Math.floor(Math.random() * colors.length)],
    };
    setNotes(notes.concat(newNote));
  }

  function updateNote(id, text) {
    setNotes(notes.map((note) => (note.id === id ? { ...note, text } : note)));
  }

  function deleteNote(id) {
    setNotes(notes.filter((note) => note.id !== id));
  }

  function autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  return (
    <>
      {loading && <CenterSpinner />}
      <PageContainer>
        <div className="flex w-full h-screen">
          <div className="flex-1 p-8 overflow-auto">
            <h1 className="text-[2rem] text-orange-400 dark:text-white mb-8">
              Write important info.
            </h1>
            <HamburgerMenu />
            <h2 className="text-lg text-orange-900 dark:text-white mb-8">
              button here
            </h2>

            <button
              onClick={addNote}
              className="mb-4 px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500"
            >
              Notes
            </button>

            <div className="flex flex-wrap gap-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 w-60 min-h-[160px] relative rounded shadow"
                  style={{ backgroundColor: note.color }}
                >
                  <textarea
                    value={note.text}
                    onChange={(e) => updateNote(note.id, e.target.value)}
                    onInput={(e) => autoResizeTextarea(e.target)}
                    ref={(el) => el && autoResizeTextarea(el)}
                    className="w-full bg-transparent resize-none focus:outline-none"
                    placeholder="내용 입력..."
                    style={{
                      minHeight: "120px",
                      maxHeight: "400px",
                      overflow: "hidden",
                    }}
                  />
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="absolute top-1 right-1 text-red-600 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div></div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}

export default Contact;
