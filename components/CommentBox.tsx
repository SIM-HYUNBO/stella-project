"use client";

import TextAvatar from "@/components/TextAvatar";
import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../app/firebase";

export default function CommentBox() {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) =>
      setUser(currentUser)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "comments"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setComments(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!comment.trim()) return;
    if (!user) return alert("로그인 후 댓글 작성 가능!");

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const nickname = userDoc.exists() ? userDoc.data().nickname : "익명";

      await addDoc(collection(db, "comments"), {
        text: comment,
        userEmail: user.email,
        userNickname: nickname,
        likes: [],
        createdAt: Timestamp.now(),
      });
      setComment("");
    } catch (err) {
      console.error("❌ 댓글 저장 실패:", err);
      alert("댓글 저장 중 문제가 발생했습니다.");
    }
  };

  const handleLike = async (id: string, likes: string[], commentUserEmail: string) => {
    if (!user) return alert("로그인 후 좋아요 가능!");
    if (user.email === commentUserEmail)
      return alert("자신의 댓글에는 좋아요를 누를 수 없습니다.");

    const ref = doc(db, "comments", id);
    const hasLiked = likes.includes(user.uid);

    try {
      await updateDoc(ref, {
        likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });
    } catch (err) {
      console.error("❌ 좋아요 실패:", err);
    }
  };

  const handleDelete = async (id: string, commentUserEmail: string) => {
    if (!user || user.email !== commentUserEmail)
      return alert("본인 댓글만 삭제할 수 있습니다!");

    try {
      await deleteDoc(doc(db, "comments", id));
    } catch (err) {
      console.error("❌ 댓글 삭제 실패:", err);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-pink-100 p-4 mt-5 rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-orange-900 mb-2">Communication</h2>

      <form onSubmit={handleSubmit} className="flex mb-4 space-x-2">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={user ? "댓글을 입력하세요..." : "로그인 후 이용 가능"}
          className="flex-1 border border-gray-200 rounded px-3 py-2 focus:outline-none"
          disabled={!user}
        />
        <button
          type="submit"
          className={`px-4 py-2 rounded text-white ${
            user ? "bg-blue-400 hover:bg-blue-500" : "bg-gray-400 cursor-not-allowed"
          }`}
          disabled={!user}
        >
          등록
        </button>
      </form>

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : comments.length === 0 ? (
        <p className="text-gray-500">아직 댓글이 없습니다 😄</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {comments.map((c) => (
            <div
              key={c.id}
              className="border-b border-gray-200 pb-3 flex items-start space-x-3"
            >
              <TextAvatar nickname={c.userNickname} size={40} />

              <div>
                <p className="font-semibold text-orange-900">
                  {c.userNickname || c.userEmail}
                </p>
                <p className="text-gray-800">{c.text}</p>

                <div className="flex items-center space-x-3 mt-1">
                  <button
                    onClick={() => handleLike(c.id, c.likes || [], c.userEmail)}
                    className="text-blue-500 hover:text-blue-600 text-sm"
                  >
                    👍 {c.likes?.length || 0}
                  </button>

                  {user?.email === c.userEmail && (
                    <button
                      onClick={() => handleDelete(c.id, c.userEmail)}
                      className="text-red-500 hover:text-red-600 text-sm"
                    >
                      🗑 삭제
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
