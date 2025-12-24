"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db } from "./firebase";
import { getUserNickname } from "../app/getNickname";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

/* ================= utils ================= */
const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const moveCaretToEnd = (el: HTMLElement) => {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel?.removeAllRanges();
  sel?.addRange(range);
};

/* ================= types ================= */
type Slide = {
  id: string;
  uid: string;
  nickname: string;
  title: string;
  subtitle: string;
  content: string;
  createdAt: any;
};

/* ================= component ================= */
export default function SlideEditor() {
  const editorRef = useRef<HTMLDivElement>(null);

  const [nickname, setNickname] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [current, setCurrent] = useState({
    title: "",
    subtitle: "",
    content: "",
  });

  const slidesRef = collection(db, "slides");

  /* 로그인 + 닉네임 */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      const nick = await getUserNickname(user.uid);
      setNickname(nick);
    });
    return () => unsub();
  }, []);

  /* 슬라이드 구독 */
  useEffect(() => {
    const unsub = onSnapshot(slidesRef, (snap) => {
      setSlides(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Slide) }))
      );
    });
    return () => unsub();
  }, []);

  /* 저장 */
  const saveSlide = async () => {
    const user = auth.currentUser;
    if (!user || !nickname) return;

    await addDoc(slidesRef, {
      uid: user.uid,
      nickname,
      title: current.title,
      subtitle: current.subtitle,
      content: current.content,
      createdAt: serverTimestamp(),
    });

    setCurrent({ title: "", subtitle: "", content: "" });
    if (editorRef.current) editorRef.current.innerHTML = "";
  };

  /* 삭제 */
  const removeSlide = async (slide: Slide) => {
    if (slide.uid !== auth.currentUser?.uid) return;
    await deleteDoc(doc(db, "slides", slide.id));
  };

  /* 수정 */
  const editSlide = (slide: Slide) => {
    if (slide.uid !== auth.currentUser?.uid) return;

    setCurrent({
      title: slide.title,
      subtitle: slide.subtitle,
      content: slide.content,
    });

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = slide.content;
        moveCaretToEnd(editorRef.current);
      }
    }, 0);
  };

  /* 미디어 삽입 */
  const insertMedia = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video"
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editorRef.current) return;

    const base64 = await fileToBase64(file);
    const html =
      type === "image"
        ? `<img src="${base64}" style="max-width:100%; margin:8px 0;" />`
        : `<video src="${base64}" controls style="max-width:100%; margin:8px 0;"></video>`;

    editorRef.current.innerHTML += html;
    setCurrent((c) => ({
      ...c,
      content: editorRef.current!.innerHTML,
    }));

    moveCaretToEnd(editorRef.current);
  };

  /* ================= render ================= */
  return (
    <div className="p-6 bg-white min-h-screen">
      {/* ===== Editor ===== */}
      <div className="border p-4 mb-8">
        <input
          className="w-full text-3xl font-bold mb-2"
          placeholder="제목"
          value={current.title}
          onChange={(e) =>
            setCurrent({ ...current, title: e.target.value })
          }
        />

        <input
          className="w-full text-xl mb-3"
          placeholder="부제목"
          value={current.subtitle}
          onChange={(e) =>
            setCurrent({ ...current, subtitle: e.target.value })
          }
        />

        <div
          ref={editorRef}
          className="border min-h-[240px] p-3"
          contentEditable
          suppressContentEditableWarning
          onInput={(e) =>
            setCurrent({
              ...current,
              content: e.currentTarget.innerHTML,
            })
          }
          onFocus={(e) => moveCaretToEnd(e.currentTarget)}
        />

        <div className="flex gap-2 mt-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => insertMedia(e, "image")}
          />
          <input
            type="file"
            accept="video/*"
            onChange={(e) => insertMedia(e, "video")}
          />
          <button
            onClick={saveSlide}
            className="ml-auto px-4 py-2 bg-green-600 text-white rounded"
          >
            업로드
          </button>
        </div>
      </div>

      {/* ===== PPT 목록 ===== */}
      <h2 className="text-xl font-bold mb-4">업로드된 PPT</h2>

      <div className="space-y-10">
        {slides.map((s) => {
          const mine = s.uid === auth.currentUser?.uid;

          return (
            <div key={s.id} className="border p-4 relative">
              <div className="text-sm text-gray-500 mb-2">
                {s.nickname}
              </div>

              <h2 className="text-2xl font-bold">{s.title}</h2>
              <h3 className="text-lg mb-4">{s.subtitle}</h3>

              {/* PPT 전체 렌더 */}
              <div
                className="ppt-body"
                dangerouslySetInnerHTML={{ __html: s.content }}
              />

              {mine && (
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => editSlide(s)}
                    className="px-2 py-1 bg-yellow-400 rounded"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => removeSlide(s)}
                    className="px-2 py-1 bg-red-600 text-white rounded"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
