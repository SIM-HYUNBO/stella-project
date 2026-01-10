"use client";

import PageContainer from "@/components/PageContainer";
import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

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
  likes: string[]; // 👍 uid 배열 (중복 방지)
  comments: Comment[];
};

export default function SongCommunity() {
  const [songs, setSongs] = useState<SongPost[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [audio, setAudio] = useState<string>("");

  /* ---------- Auth ---------- */
  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  /* ---------- Firestore 구독 ---------- */
  useEffect(() => {
    return onSnapshot(collection(db, "songs"), (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as SongPost)
      );
      setSongs(list.reverse());
    });
  }, []);

  /* ---------- Base64 변환 ---------- */
  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  /* ---------- 업로드 ---------- */
  const handleUpload = async () => {
    if (!user || !user.displayName || !title || !audio) return;

    await addDoc(collection(db, "songs"), {
      uid: user.uid,
      username: user.displayName,
      title,
      audioBase64: audio,
      likes: [],
      comments: [],
      createdAt: Date.now(),
    });

    setTitle("");
    setAudio("");
  };

  /* ---------- 좋아요 (중복 방지) ---------- */
 const handleLike = async (song: SongPost) => {
  if (!user) return;

  const likes = Array.isArray(song.likes) ? song.likes : [];

  if (likes.includes(user.uid)) return;

  await updateDoc(doc(db, "songs", song.id), {
    likes: [...likes, user.uid],
  });
};


  /* ---------- 게시글 삭제 ---------- */
  const handleDeleteSong = async (song: SongPost) => {
    if (!user || user.uid !== song.uid) return;
    await deleteDoc(doc(db, "songs", song.id));
  };

  /* ---------- 댓글 추가 ---------- */
  const handleAddComment = async (song: SongPost, text: string) => {
    if (!user || !user.displayName || !text) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      uid: user.uid,
      username: user.displayName,
      content: text,
    };

    await updateDoc(doc(db, "songs", song.id), {
      comments: [...song.comments, newComment],
    });
  };

  /* ---------- 댓글 삭제 ---------- */
  const handleDeleteComment = async (song: SongPost, commentId: string) => {
    if (!user) return;

    await updateDoc(doc(db, "songs", song.id), {
      comments: song.comments.filter(
        (c) => !(c.id === commentId && c.uid === user.uid)
      ),
    });
  };

  return (
    <PageContainer>
      <section className="py-12">
        <h2 className="text-4xl text-center mb-10 text-orange-400">
          노래 좀 부른다? 당장 업로드!
        </h2>
   
      {/* 업로드 */}
      <div className="bg-white p-6 rounded-xl shadow mb-10">
        <div className="flex gap-3">
          <input
            className="border px-3 py-2 rounded flex-1"
            placeholder="노래 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="file"
            accept="audio/*"
            onChange={async (e) => {
              if (e.target.files?.[0]) {
                setAudio(await fileToBase64(e.target.files[0]));
              }
            }}
          />
          <button
            onClick={handleUpload}
            className="bg-blue-500 text-white px-4 rounded"
          >
            업로드
          </button>
        </div>
      </div>

      {/* 목록 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {songs.map((s) => (
          <div key={s.id} className="bg-white p-4 rounded-xl shadow">
            <div className="flex justify-between">
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

            <p className="text-sm text-gray-500 mb-2">
              by {s.username}
            </p>

            <audio controls src={s.audioBase64} className="w-full mb-2" />

            <button
              onClick={() => handleLike(s)}
              className="text-red-500 font-bold"
            >
              ❤️ {Array.isArray(s.likes) ? s.likes.length : s.likes || 0}

            </button>

            {/* 댓글 */}
            <div className="mt-3">
              {s.comments.map((c) => (
                <div key={c.id} className="text-sm flex justify-between">
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
    <div className="flex gap-2 mt-2">
      <input
        className="border rounded px-2 py-1 text-sm flex-1"
        placeholder="댓글 달기"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={() => {
          onSubmit(text);
          setText("");
        }}
        className="bg-green-500 text-white px-2 rounded text-sm"
      >
        등록
      </button>
    </div>
  );
}
