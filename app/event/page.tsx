"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/app/firebase";

/* ======================
   타입
====================== */
type Post = {
  id: number;
  uid: string;
  title: string;
  description: string;
  image?: string;
  nickname: string;
  likedBy: string[]; // 👍 좋아요
};

type UserProfile = {
  uid: string;
  nickname: string;
};

type SnowFlake = {
  id: number;
  left: number;
  size: number;
  duration: number;
};

const STORAGE_KEY = "wagie_event_posts";

/* ======================
   UTF-8 안전 인코딩
====================== */
const encode = (v: any) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(v))));
const decode = (v: string) =>
  JSON.parse(decodeURIComponent(escape(atob(v))));

export default function WagieChristmasEventPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [flakes, setFlakes] = useState<SnowFlake[]>([]);

  /* ======================
     로그인 + 닉네임
  ====================== */
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return setUserProfile(null);

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
  }, []);

  /* ======================
     로컬 저장 로드
  ====================== */
  useEffect(() => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;

    const parsed = decode(data).map((p: any) => ({
      ...p,
      likedBy: Array.isArray(p.likedBy) ? p.likedBy : [],
    }));

    setPosts(parsed);
  }, []);

  const save = (list: Post[]) =>
    localStorage.setItem(STORAGE_KEY, encode(list));

  /* ======================
     ❄️ 눈 생성 (크기 랜덤)
  ====================== */
  useEffect(() => {
    const i = setInterval(() => {
      setFlakes((p) => [
        ...p.slice(-60),
        {
          id: Date.now() + Math.random(),
          left: Math.random() * window.innerWidth,
          size: Math.random() * 14 + 10,
          duration: Math.random() * 5 + 6,
        },
      ]);
    }, 200);
    return () => clearInterval(i);
  }, []);

  /* ======================
     이미지 업로드
  ====================== */
  const handleImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  /* ======================
     등록
  ====================== */
  const addPost = () => {
    if (!userProfile) return alert("로그인이 필요합니다.");
    if (!title || !description) return alert("제목과 설명을 입력하세요.");

    const post: Post = {
      id: Date.now(),
      uid: userProfile.uid,
      title,
      description,
      image: image || undefined,
      nickname: userProfile.nickname,
      likedBy: [],
    };

    const updated = [post, ...posts];
    setPosts(updated);
    save(updated);

    setTitle("");
    setDescription("");
    setImage(null);
    setShowForm(false);
  };

  /* ======================
     삭제
  ====================== */
  const deletePost = (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const updated = posts.filter((p) => p.id !== id);
    setPosts(updated);
    save(updated);
  };

  /* ======================
     좋아요
  ====================== */
  const toggleLike = (id: number) => {
    if (!userProfile) return alert("로그인이 필요합니다.");

    const updated = posts.map((p) =>
      p.id === id
        ? {
            ...p,
            likedBy: p.likedBy.includes(userProfile.uid)
              ? p.likedBy.filter((uid) => uid !== userProfile.uid)
              : [...p.likedBy, userProfile.uid],
          }
        : p
    );

    setPosts(updated);
    save(updated);
  };

  return (
    <div className="min-h-screen bg-red-50 relative overflow-hidden">
      {/* ❄️ 눈 */}
      {flakes.map((f) => (
        <span
          key={f.id}
          className="absolute top-0 pointer-events-none"
          style={{
            left: f.left,
            fontSize: f.size,
            animation: `fall ${f.duration}s linear forwards`,
          }}
        >
          ❄️
        </span>
      ))}

      <div className="max-w-2xl mx-auto p-4 relative z-10">
        <h1 className="text-3xl font-bold text-center text-red-600 mb-4">
          🎨 와기 새해 이벤트
        </h1>

        <div className="flex justify-end mb-3">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-10 h-10 bg-red-500 text-white rounded-full text-xl"
          >
            +
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-4 rounded shadow mb-4">
            <input
              className="w-full border p-2 mb-2"
              placeholder="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              className="w-full border p-2 mb-2"
              placeholder="설명 (작품 설명, 콘셉트 등)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <input
              type="file"
              accept="image/*"
              className="mb-2"
              onChange={(e) =>
                e.target.files && handleImage(e.target.files[0])
              }
            />

            {image && (
              <img src={image} className="max-h-60 rounded mb-2 mx-auto" />
            )}

            <button
              onClick={addPost}
              className="bg-red-500 text-white px-4 py-2 rounded w-full"
            >
              등록
            </button>
          </div>
        )}

        {posts.map((p) => {
          const liked = userProfile
            ? p.likedBy.includes(userProfile.uid)
            : false;

          return (
            <div key={p.id} className="bg-white p-4 mb-4 rounded shadow">
              <div className="flex justify-between mb-1">
                <p className="text-sm text-gray-500">🎨 {p.nickname}</p>

                {userProfile?.uid === p.uid && (
                  <button
                    onClick={() => deletePost(p.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    삭제
                  </button>
                )}
              </div>

              <h2 className="font-bold mb-1">{p.title}</h2>
              <p className="mb-2">{p.description}</p>

              {p.image && (
                <img src={p.image} className="rounded max-h-72 mx-auto" />
              )}

              <button
                onClick={() => toggleLike(p.id)}
                className={`mt-2 text-sm ${
                  liked ? "text-red-500" : "text-gray-400"
                }`}
              >
                ❤️ {p.likedBy.length}
              </button>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-10px);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
