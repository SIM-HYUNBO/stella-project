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

  useEffect(() => {
    const savedComments = localStorage.getItem("comments");
    if (savedComments) {
      setComments(JSON.parse(savedComments));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("comments", JSON.stringify(comments));
  }, [comments]);

  useEffect(() => {
    const q = query(collection(db, "comments"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!comment.trim()) return;

    await addDoc(collection(db, "comments"), {
      text: comment,
      user: "Stella❤",
      createdAt: Timestamp.fromDate(new Date()),
    });

    setComment("");
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "comments", id));
  };

  // ✅ 모든 JSX는 함수 내부 return 안에 있어야 함
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

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {comments.map((c) => (
          <div
            key={c.id}
            className="border-b border-gray-200 pb-2 flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{c.user}</p>
              <p>{c.text}</p>
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
    </div>
  );
}
