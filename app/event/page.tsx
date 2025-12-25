"use client";

import { useEffect, useState } from "react";

type Reply = {
  id: number;
  text: string;
};

type Post = {
  id: number;
  title: string;
  content: string;
  likes: number;
  liked?: boolean; // 좋아요 중복 방지
  replies: Reply[];
};

const LOCAL_STORAGE_KEY = "wagie_christmas_posts";

export default function WagieChristmasPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [flakes, setFlakes] = useState<{ id: number; left: number }[]>([]);

  // 글 로드
  useEffect(() => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) {
      try {
        const decoded = atob(data);
        const parsed: Post[] = JSON.parse(decoded);
        setPosts(parsed.sort((a, b) => b.id - a.id));
      } catch (e) {
        console.error("로컬 데이터 파싱 실패:", e);
      }
    }
  }, []);

  // 눈 생성
  useEffect(() => {
    const interval = setInterval(() => {
      setFlakes((prev) => [
        ...prev,
        { id: Date.now(), left: Math.random() * window.innerWidth },
      ]);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // 눈 제거 (애니메이션 끝나면)
  useEffect(() => {
    const timeout = setInterval(() => {
      setFlakes((prev) => prev.filter((f) => f.id + 8000 > Date.now()));
    }, 1000);
    return () => clearInterval(timeout);
  }, []);

  // 로컬 저장
  const saveToLocalStorage = (updatedPosts: Post[]) => {
    const json = JSON.stringify(updatedPosts);
    const encoded = btoa(json);
    localStorage.setItem(LOCAL_STORAGE_KEY, encoded);
  };

  // 글 추가
  const addPost = () => {
    if (!title || !content) return alert("제목과 내용을 모두 입력해주세요!");
    const newPost: Post = {
      id: Date.now(),
      title,
      content,
      likes: 0,
      liked: false,
      replies: [],
    };
    const updatedPosts = [newPost, ...posts];
    setPosts(updatedPosts);
    saveToLocalStorage(updatedPosts);
    setTitle("");
    setContent("");
    setShowForm(false);
  };

  // 좋아요 (중복 방지)
  const likePost = (id: number) => {
    const updatedPosts = posts.map((p) =>
      p.id === id
        ? p.liked
          ? p
          : { ...p, likes: p.likes + 1, liked: true }
        : p
    );
    setPosts(updatedPosts);
    saveToLocalStorage(updatedPosts);
  };

  // 글 삭제
  const deletePost = (id: number) => {
    const updatedPosts = posts.filter((p) => p.id !== id);
    setPosts(updatedPosts);
    saveToLocalStorage(updatedPosts);
  };

  // 답글 추가
  const addReply = (postId: number, text: string) => {
    if (!text) return;
    const updatedPosts = posts.map((p) =>
      p.id === postId
        ? { ...p, replies: [...p.replies, { id: Date.now(), text }] }
        : p
    );
    setPosts(updatedPosts);
    saveToLocalStorage(updatedPosts);
  };

  return (
    <div className="relative min-h-screen bg-red-50 overflow-hidden">
      {/* 눈 애니메이션 */}
      {flakes.map((f) => (
        <span
          key={f.id}
          className="absolute text-white text-xl animate-fall"
          style={{ left: f.left, top: -20 }}
        >
          ❄️
        </span>
      ))}

      <div className="max-w-2xl mx-auto p-4 relative z-10">
        <h1 className="text-3xl font-bold text-center text-red-600 mb-6">
          🎄 와기 크리스마스!
        </h1>

        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-10 h-10 rounded-full bg-red-500 text-white text-2xl"
          >
            +
          </button>
        </div>

        {showForm && (
          <div className="border rounded p-3 mb-6 bg-red-50">
            <input
              className="w-full border rounded px-2 py-1 mb-2"
              placeholder="제목 추가..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full border rounded px-2 py-1 mb-2"
              placeholder="글 추가..."
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <button
              onClick={addPost}
              className="px-4 py-2 bg-red-500 text-white rounded"
            >
              제출
            </button>
          </div>
        )}

        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="border rounded p-4 bg-white shadow">
              <div className="flex justify-between items-start">
                <h2 className="font-bold text-lg">{post.title}</h2>
                <button
                  onClick={() => deletePost(post.id)}
                  className="text-gray-400 hover:text-red-500 text-sm"
                >
                  삭제
                </button>
              </div>

              <p className="mt-2 text-gray-700">{post.content}</p>

              <div className="flex gap-4 mt-3 text-sm">
                <button
                  onClick={() => likePost(post.id)}
                  className={`text-red-500 ${post.liked ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={post.liked}
                >
                  ❤️ 좋아요 {post.likes}
                </button>
              </div>

              <ReplySection
                replies={post.replies}
                onAdd={(text) => addReply(post.id, text)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* CSS 애니메이션 */}
      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
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

function ReplySection({
  replies,
  onAdd,
}: {
  replies: Reply[];
  onAdd: (text: string) => void;
}) {
  const [reply, setReply] = useState("");

  return (
    <div className="mt-3">
      <div className="space-y-1 mb-2">
        {replies.map((r) => (
          <div
            key={r.id}
            className="text-sm bg-gray-100 rounded px-2 py-1"
          >
            💬 {r.text}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1 text-sm"
          placeholder="답글 달기..."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <button
          onClick={() => {
            onAdd(reply);
            setReply("");
          }}
          className="text-sm px-2 py-1 bg-gray-300 rounded"
        >
          등록
        </button>
      </div>
    </div>
  );
}
