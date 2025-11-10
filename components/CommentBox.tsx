"use client";

import { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../app/firebase";

export default function CommentBox() {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ✅ 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Firestore 실시간 댓글 불러오기
  useEffect(() => {
    const q = query(collection(db, "comments"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const commentList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setComments(commentList);
        setLoading(false);
      },
      (error) => {
        console.error("❌ Firestore 읽기 오류:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ✅ 댓글 작성
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!comment.trim()) return;
    if (!user) {
      alert("로그인 후 댓글을 작성할 수 있습니다!");
      return;
    }

    try {
      await addDoc(collection(db, "comments"), {
        text: comment,
        user: user.email, // 로그인한 사용자의 이메일 저장
        createdAt: Timestamp.now(),
      });
      setComment("");
    } catch (error) {
      console.error("❌ Firestore 저장 실패:", error);
      alert("댓글 저장에 실패했습니다. 콘솔을 확인하세요.");
    }
  };

  // ✅ 댓글 삭제 (본인만 가능)
  const handleDelete = async (id: string, commentUser: string) => {
    if (!user || user.email !== commentUser) {
      alert("본인 댓글만 삭제할 수 있습니다!");
      return;
    }

    try {
      await deleteDoc(doc(db, "comments", id));
    } catch (error) {
      console.error("❌ Firestore 삭제 실패:", error);
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
          placeholder={
            user
              ? "여러분의 지식을 입력하세요..."
              : "로그인 후 댓글을 작성할 수 있습니다."
          }
          className="flex-1 border border-gray-200 rounded px-3 py-2 focus:outline-none"
          disabled={!user}
        />
        <button
          type="submit"
          className={`px-4 py-2 rounded text-white transition ${
            user
              ? "bg-blue-400 hover:bg-blue-500"
              : "bg-gray-400 cursor-not-allowed"
          }`}
          disabled={!user}
        >
          Submit
        </button>
      </form>

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : comments.length === 0 ? (
        <p className="text-gray-500">아직 댓글이 없습니다 😄</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {comments.map((c) => (
            <div
              key={c.id}
              className="border-b border-gray-200 pb-2 flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-orange-900">{c.user}</p>
                <p className="text-gray-800">{c.text}</p>
              </div>

              {/* 🔒 본인 댓글만 삭제 버튼 표시 */}
              {user && user.email === c.user && (
                <button
                  onClick={() => handleDelete(c.id, c.user)}
                  className="text-red-500 hover:text-red-600 ml-4"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
