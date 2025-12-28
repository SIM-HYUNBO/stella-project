"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/app/firebase";

/* ======================
   타입
====================== */
type Reply = {
  id: number;
  text: string;
  nickname: string;
};

type Post = {
  id: number;
  uid: string;
  title: string;
  content: string;
  nickname: string;
  likedBy: string[];
  replies: Reply[];
};

type UserProfile = {
  uid: string;
  nickname: string;
};

const STORAGE_KEY = "wagie_event_posts";

/* ======================
   Base64 (UTF-8 안전)
====================== */
const encode = (v: any) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(v))));
const decode = (v: string) =>
  JSON.parse(decodeURIComponent(escape(atob(v))));

/* ======================
   페이지
====================== */
export default function WagieChristmasEventPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [flakes, setFlakes] = useState<{ id: number; left: number }[]>([]);

  /* ===== Auth + 닉네임 ===== */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserProfile(null);
        return;
      }

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        const nickname = user.displayName || `와기${user.uid.slice(0, 5)}`;
        await setDoc(ref, {
          uid: user.uid,
          nickname,
          createdAt: Timestamp.now(),
        });
        setUserProfile({ uid: user.uid, nickname });
      } else {
        setUserProfile(snap.data() as UserProfile);
      }
    });

    return () => unsub();
  }, []);

  /* ===== 로드 + 마이그레이션 ===== */
  useEffect(() => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;

    try {
      const parsed = decode(data).map((p: any) => ({
        ...p,
        likedBy: Array.isArray(p.likedBy) ? p.likedBy : [],
        replies: Array.isArray(p.replies) ? p.replies : [],
      }));

      setPosts(parsed);
      save(parsed);
    } catch (e) {
      console.error("로컬 데이터 파싱 실패", e);
    }
  }, []);

  const save = (list: Post[]) =>
    localStorage.setItem(STORAGE_KEY, encode(list));

  /* ===== 눈 ===== */
  useEffect(() => {
    const i = setInterval(() => {
      setFlakes((p) => [
        ...p.slice(-50),
        { id: Date.now() + Math.random(), left: Math.random() * window.innerWidth },
      ]);
    }, 200);
    return () => clearInterval(i);
  }, []);

  /* ===== 글 작성 ===== */
  const addPost = () => {
    if (!userProfile) return alert("로그인 필요");
    if (!title || !content) return;

    const post: Post = {
      id: Date.now(),
      uid: userProfile.uid,
      title,
      content,
      nickname: userProfile.nickname,
      likedBy: [],
      replies: [],
    };

    const updated = [post, ...posts];
    setPosts(updated);
    save(updated);
    setTitle("");
    setContent("");
    setShowForm(false);
  };

  /* ===== 삭제 ===== */
  const deletePost = (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const updated = posts.filter((p) => p.id !== id);
    setPosts(updated);
    save(updated);
  };

  /* ===== 좋아요 ===== */
  const toggleLike = (postId: number) => {
    if (!userProfile) return alert("로그인 필요");

    const updated = posts.map((p) => {
      const likedBy = p.likedBy ?? [];
      return p.id === postId
        ? {
            ...p,
            likedBy: likedBy.includes(userProfile.uid)
              ? likedBy.filter((id) => id !== userProfile.uid)
              : [...likedBy, userProfile.uid],
          }
        : p;
    });

    setPosts(updated);
    save(updated);
  };

  /* ===== 답글 ===== */
  const addReply = (id: number, text: string) => {
    if (!userProfile || !text.trim()) return;

    const updated = posts.map((p) =>
      p.id === id
        ? {
            ...p,
            replies: [
              ...p.replies,
              { id: Date.now(), text, nickname: userProfile.nickname },
            ],
          }
        : p
    );

    setPosts(updated);
    save(updated);
  };

  return (
    <div className="min-h-screen bg-red-50 relative overflow-hidden">
      {/* 눈 */}
      {flakes.map((f) => (
        <span
          key={f.id}
          className="absolute top-0 text-xl animate-fall"
          style={{ left: f.left }}
        >
          ❄️
        </span>
      ))}

      <div className="max-w-2xl mx-auto p-4 relative z-10">
        <h1 className="text-3xl text-center font-bold text-red-600 mb-2">
          🎄 와기 크리스마스 이벤트
        </h1>

        {userProfile && (
          <p className="text-center mb-4 text-gray-600">
            👋 {userProfile.nickname} 님
          </p>
        )}

        <div className="flex justify-end mb-3">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-10 h-10 bg-red-500 text-white rounded-full text-xl"
          >
            +
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-3 rounded shadow mb-4">
            <input
              className="w-full border p-2 mb-2"
              placeholder="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full border p-2 mb-2"
              placeholder="내용"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <button
              onClick={addPost}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              등록
            </button>
          </div>
        )}

        {posts.map((p) => (
          <PostItem
            key={p.id}
            post={p}
            user={userProfile}
            onDelete={deletePost}
            onLike={toggleLike}
            onReply={addReply}
          />
        ))}
      </div>

      {/* 애니메이션 */}
      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall 8s linear forwards;
        }
      `}</style>
    </div>
  );
}

/* ======================
   게시글 컴포넌트
====================== */
function PostItem({
  post,
  user,
  onDelete,
  onLike,
  onReply,
}: {
  post: Post;
  user: UserProfile | null;
  onDelete: (id: number) => void;
  onLike: (id: number) => void;
  onReply: (id: number, text: string) => void;
}) {
  const [text, setText] = useState("");

  const likedBy = post.likedBy ?? [];
  const liked = user ? likedBy.includes(user.uid) : false;

  return (
    <div className="bg-white p-4 mb-4 rounded shadow">
      <div className="flex justify-between mb-1">
        <p className="text-sm text-gray-500">✍ {post.nickname}</p>
        {user?.uid === post.uid && (
          <button
            onClick={() => onDelete(post.id)}
            className="text-sm text-red-500"
          >
            삭제
          </button>
        )}
      </div>

      <h2 className="font-bold">{post.title}</h2>
      <p className="mt-1">{post.content}</p>

      <button
        onClick={() => onLike(post.id)}
        className={`mt-2 text-sm ${
          liked ? "text-red-500" : "text-gray-400"
        }`}
      >
        ❤️ {likedBy.length}
      </button>

      {post.replies.map((r) => (
        <div key={r.id} className="text-sm bg-gray-100 p-2 mt-2 rounded">
          <b>{r.nickname}</b> : {r.text}
        </div>
      ))}

      <div className="flex gap-2 mt-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 border px-2 py-1 text-sm"
          placeholder="답글..."
        />
        <button
          onClick={() => {
            onReply(post.id, text);
            setText("");
          }}
          className="bg-gray-300 px-2 rounded text-sm"
        >
          등록
        </button>
      </div>
    </div>
  );
}
