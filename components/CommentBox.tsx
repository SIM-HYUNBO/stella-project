"use client";

import { useEffect, useState } from "react";
import { db } from "../components/firebase";
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

export default function CommentBox() {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Firestore 실시간 댓글 불러오기
  useEffect(() => {
    const q = query(collection(db, "comments"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComments(commentList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ 댓글 작성
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      await addDoc(collection(db, "comments"), {
        text: comment,
        user: "Stella❤",
        createdAt: Timestamp.now(),
      });
      setComment("");
    } catch (error) {
      console.error("❌ Firestore 저장 실패:", error);
    }
  };

  // ✅ 댓글 삭제
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "comments", id));
    } catch (error) {
      console.error("❌ Firestore 삭제 실패:", error);
    }
  };

  // ✅ 렌더링
  return (
    <div className="w-full max-w-2xl bg-pink-100 p-4 mt-5 rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-orange-900 mb-2">Communication</h2>

      <form onSubmit={handleSubmit} className="flex mb-4 space-x-2">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="여러분의 지식을 입력하세요..."
          className="flex-1 border border-gray-200 rounded px-3 py-2 focus:outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500"
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
              <button
                onClick={() => handleDelete(c.id)}
                className="text-red-500 hover:text-red-600 ml-4"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
