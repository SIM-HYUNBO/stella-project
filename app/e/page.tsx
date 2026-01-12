"use client";

import PageContainer from "@/components/PageContainer";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/app/firebase";

/* ---------- 타입 ---------- */
type Comment = {
  id: string;
  uid: string;
  username: string;
  content: string;
};

type SongPost = {
  id: string;
  uid: string;
  username: string;
  title: string;
  audioBase64: string;
  likes: string[];
  comments: Comment[];
};

export default function SongCommunity() {
  const [user, setUser] = useState<User | null>(null);
  const [songs, setSongs] = useState<SongPost[]>([]);
  const [title, setTitle] = useState("");
  const [audio, setAudio] = useState<string>("");

  /* ---------- Auth ---------- */
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  /* ---------- 로컬스토리지 불러오기 ---------- */
  useEffect(() => {
    const stored = localStorage.getItem("songs");
    if (stored) setSongs(JSON.parse(stored));
  }, []);

  /* ---------- 로컬스토리지 저장 ---------- */
  const saveToLocal = (data: SongPost[]) => {
    localStorage.setItem("songs", JSON.stringify(data));
    setSongs(data);
  };

  /* ---------- Base64 변환 ---------- */
  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  /* ---------- 업로드 ---------- */
  const handleUpload = () => {
    if (!user || !user.displayName || !title || !audio) return;

    const newSong: SongPost = {
      id: Date.now().toString(),
      uid: user.uid,
      username: user.displayName,
      title,
      audioBase64: audio,
      likes: [],
      comments: [],
    };

    saveToLocal([newSong, ...songs]);
    setTitle("");
    setAudio("");
  };

  /* ---------- 좋아요 ---------- */
  const handleLike = (song: SongPost) => {
    if (!user) return;
    if (song.likes.includes(user.uid)) return;

    const updated = songs.map((s) =>
      s.id === song.id ? { ...s, likes: [...s.likes, user.uid] } : s
    );
    saveToLocal(updated);
  };

  /* ---------- 게시글 삭제 ---------- */
  const handleDeleteSong = (song: SongPost) => {
    if (!user || song.uid !== user.uid) return;
    const updated = songs.filter((s) => s.id !== song.id);
    saveToLocal(updated);
  };

  /* ---------- 댓글 추가 ---------- */
  const handleAddComment = (song: SongPost, text: string) => {
    if (!user || !user.displayName || !text) return;
    const newComment: Comment = {
      id: Date.now().toString(),
      uid: user.uid,
      username: user.displayName,
      content: text,
    };
    const updated = songs.map((s) =>
      s.id === song.id ? { ...s, comments: [...s.comments, newComment] } : s
    );
    saveToLocal(updated);
  };

  /* ---------- 댓글 삭제 ---------- */
  const handleDeleteComment = (song: SongPost, commentId: string) => {
    if (!user) return;
    const updated = songs.map((s) =>
      s.id === song.id
        ? {
            ...s,
            comments: s.comments.filter(
              (c) => !(c.id === commentId && c.uid === user.uid)
            ),
          }
        : s
    );
    saveToLocal(updated);
  };

  return (
    <PageContainer>
      <section className="py-8 px-4">
        <h2 className="text-3xl text-center mb-6 text-orange-400">
          노래 좀 부른다? 당장 업로드!
        </h2>

        {/* 업로드 박스 */}
        <div className="bg-white rounded-xl shadow mb-6 w-full max-w-md mx-auto flex flex-wrap justify-center gap-2 p-3">
          {/* 제목 */}
          <input
            className="border px-2 py-2 rounded flex-1 min-w-[120px]"
            placeholder="노래 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* 파일 선택 */}
          <label className="border px-4 py-2 rounded bg-gray-100 cursor-pointer flex-none min-w-[80px] text-center relative overflow-hidden">
            파일 선택
            <input
              type="file"
              accept="audio/*"
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
              onChange={async (e) => {
                if (e.target.files?.[0])
                  setAudio(await fileToBase64(e.target.files[0]));
              }}
            />
          </label>

          {/* 업로드 버튼 */}
          <button
            onClick={handleUpload}
            className="bg-blue-500 text-white px-4 py-2 rounded flex-none min-w-[80px]"
          >
            업로드
          </button>
        </div>

        {/* 게시글 목록 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {songs.map((s) => (
            <div
              key={s.id}
              className="bg-white p-3 rounded-xl shadow flex flex-col"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold">{s.title}</h3>
                {user?.uid === s.uid && (
                  <button
                    onClick={() => handleDeleteSong(s)}
                    className="text-red-500 text-sm"
                  >
                    삭제
                  </button>
                )}
              </div>

              <p className="text-sm text-gray-500 mb-2">by {s.username}</p>

              <audio controls src={s.audioBase64} className="w-full mb-2" />

              <button
                onClick={() => handleLike(s)}
                className="text-red-500 font-bold mb-2"
              >
                ❤️ {s.likes.length}
              </button>

              {/* 댓글 */}
              <div className="mt-2">
                {s.comments.map((c) => (
                  <div
                    key={c.id}
                    className="text-sm flex justify-between mb-1"
                  >
                    <span>
                      <b>{c.username}</b>: {c.content}
                    </span>
                    {user?.uid === c.uid && (
                      <button
                        onClick={() => handleDeleteComment(s, c.id)}
                        className="text-xs text-red-400"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}

                {user && (
                  <CommentInput
                    onSubmit={(text) => handleAddComment(s, text)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}

/* ---------- 댓글 입력 ---------- */
function CommentInput({ onSubmit }: { onSubmit: (t: string) => void }) {
  const [text, setText] = useState("");

  return (
    <div className="flex gap-2 mt-1 flex-wrap">
      <input
        className="border rounded px-2 py-1 text-sm flex-1 min-w-[80px]"
        placeholder="댓글 달기"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={() => {
          onSubmit(text);
          setText("");
        }}
        className="bg-green-500 text-white px-2 py-1 rounded text-sm"
      >
        등록
      </button>
    </div>
  );
}
