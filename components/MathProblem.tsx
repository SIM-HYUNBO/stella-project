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
import CommentBox from "@/components/CommentBox"; // 맨 밑에 사용

interface Reply {
  id: string;
  text: string;
  user: string;
  createdAt: any;
}

interface Problem {
  id: string;
  text: string;
  user: string;
  createdAt: any;
}

export default function MathProblem() {
  const [problemText, setProblemText] = useState("");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: string }>({});

  // 문제 불러오기
  useEffect(() => {
    const q = query(collection(db, "problems"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, snapshot => {
      setProblems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Problem[]);
    });
    return () => unsubscribe();
  }, []);

  // 문제 등록
  const handleProblemSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!problemText.trim()) return;

    await addDoc(collection(db, "problems"), {
      text: problemText,
      user: "Stella❤",
      createdAt: Timestamp.fromDate(new Date()),
    });
    setProblemText("");
  };

  // 문제 삭제
  const handleProblemDelete = async (id: string) => {
    await deleteDoc(doc(db, "problems", id));
  };

  // 답글 등록
  const handleReplySubmit = async (problemId: string) => {
    const text = replyTexts[problemId];
    if (!text?.trim()) return;

    const repliesRef = collection(db, "problems", problemId, "replies");
    await addDoc(repliesRef, {
      text,
      user: "Anonymous",
      createdAt: Timestamp.fromDate(new Date()),
    });

    setReplyTexts({ ...replyTexts, [problemId]: "" });
  };

  // 답글 삭제
  const handleReplyDelete = async (problemId: string, replyId: string) => {
    await deleteDoc(doc(db, "problems", problemId, "replies", replyId));
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">수학 문제 공유</h1>

      {/* 문제 작성 */}
      <form onSubmit={handleProblemSubmit} className="flex mb-6 space-x-2">
        <textarea
          value={problemText}
          onChange={(e) => setProblemText(e.target.value)}
          placeholder="문제를 입력하세요 "
          className="flex-1 border border-gray-300 rounded p-2 focus:outline-none"
          rows={3}
        />
        <button type="submit" className="px-4 py-2 bg-green-400 text-white rounded hover:bg-green-500">
          문제 올리기
        </button>
      </form>

      {/* 문제 리스트 */}
      <div className="space-y-6">
        {problems.map((problem) => (
          <ProblemItem
            key={problem.id}
            problem={problem}
            replyText={replyTexts[problem.id] || ""}
            setReplyText={(text: string) => setReplyTexts({ ...replyTexts, [problem.id]: text })}
            handleReplySubmit={handleReplySubmit}
            handleProblemDelete={handleProblemDelete}
            handleReplyDelete={handleReplyDelete}
          />
        ))}
      </div>

      {/* ✅ 맨 밑에 CommentBox 추가 */}
      <div className="mt-12">
        <CommentBox />
      </div>
    </div>
  );
}

function ProblemItem({
  problem,
  replyText,
  setReplyText,
  handleReplySubmit,
  handleProblemDelete,
  handleReplyDelete,
}: {
  problem: Problem;
  replyText: string;
  setReplyText: (text: string) => void;
  handleReplySubmit: (problemId: string) => void;
  handleProblemDelete: (id: string) => void;
  handleReplyDelete: (problemId: string, replyId: string) => void;
}) {
  const [replies, setReplies] = useState<Reply[]>([]);

  useEffect(() => {
    const q = query(collection(db, "problems", problem.id, "replies"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, snapshot => {
      setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reply[]);
    });
    return () => unsubscribe();
  }, [problem.id]);

  return (
    <div className="bg-yellow-50 p-4 rounded shadow">
      <div className="flex justify-between mb-2">
        <p className="font-medium">{problem.user}</p>
        <button onClick={() => handleProblemDelete(problem.id)} className="text-red-500 hover:text-red-600">
          삭제
        </button>
      </div>

      {/* 문제 텍스트 표시 */}
      <pre className="whitespace-pre-wrap mb-3">{problem.text}</pre>

      {/* 답글 */}
      <div className="space-y-2 pl-4 border-l border-gray-300 mt-3">
        {replies.map((r) => (
          <div key={r.id} className="flex justify-between items-start">
            <div>
              <p className="font-medium">{r.user}</p>
              <pre className="whitespace-pre-wrap">{r.text}</pre>
            </div>
            <button
              onClick={() => handleReplyDelete(problem.id, r.id)}
              className="text-red-500 hover:text-red-600 ml-2"
            >
              삭제
            </button>
          </div>
        ))}

        {/* 답글 입력창 */}
        <div className="flex mt-2 space-x-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="답글을 입력하세요"
            className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none"
          />
          <button
            onClick={() => handleReplySubmit(problem.id)}
            className="px-3 py-1 bg-blue-400 text-white rounded hover:bg-blue-500"
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
}
