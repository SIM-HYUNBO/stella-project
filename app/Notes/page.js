"use client";

import { useState, useEffect } from "react";
import PageContainer from "/components/PageContainer";
import { CenterSpinner } from "/components/CenterSpinner";
import HamburgerMenu from "/components/hamburger";

// DotSpinner 컴포넌트 (파일 따로 만들 필요 없음, 그냥 페이지 안에 추가)
// function DotSpinner() {
//   return (
//     <div className="fixed inset-0 flex justify-center items-center z-50 pointer-events-none">
//       <div className="relative w-24 h-24">
//         {[...Array(8)].map((_, i) => (
//           <div
//             key={i}
//             className="absolute w-4 h-4 bg-blue-500 rounded-full"
//             style={{
//               top: "50%",
//               left: "50%",
//               margin: "-8px 0 0 -8px",
//               transform: `rotate(${i * 45}deg) translate(40px)`,
//               transformOrigin: "center center",
//               animation: `dot-spin 1.6s ease-in-out infinite`,
//               animationDelay: `${i * 0.2}s`,
//             }}
//           />
//         ))}
//       </div>

//       <style jsx>{`
//         @keyframes dot-spin {
//           0% {
//             transform: rotate(0deg) translate(40px) scale(0.5);
//             opacity: 0.3;
//           }
//           50% {
//             transform: rotate(180deg) translate(0px) scale(1.2);
//             opacity: 1;
//           }
//           100% {
//             transform: rotate(360deg) translate(40px) scale(0.5);
//             opacity: 0.3;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }

function Contact() {
  const [loading, setLoading] = useState(true); // 로딩 상태 추가
  const colors = ["#FFFA65", "#FFD966", "#FFB6B9", "#B0E0E6", "#C1FFC1"];
  const notesState = useState([]);
  const notes = notesState[0];
  const setNotes = notesState[1];

  // 로컬스토리지에서 노트 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("myNotes");
    if (saved) setNotes(JSON.parse(saved));

    // 로딩 스피너 0.8초 후 제거
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

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
      {/* {loading && <DotSpinner />} */}
      {loading && <CenterSpinner />}
      <PageContainer>
        <div className="flex w-full h-screen">
          <div className="flex-1 p-8 overflow-auto">
            <h1 className="text-5xl text-orange-400 dark:text-white mb-8">
              Write important info.
            </h1>
            <HamburgerMenu />
            <h2 className="text-2xl text-orange-900 dark:text-white mb-8">
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
