"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  collection, addDoc, updateDoc, doc,
  query, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/app/firebase";

type QnaItem = {
  id: string;
  question: string;
  askerName: string;
  askerUid: string;
  createdAt: any;
  answer: string | null;
  answeredAt: any;
};

const ADMIN = "관리자";

export default function QnaPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [uid, setUid] = useState<string>("");
  const [items, setItems] = useState<QnaItem[]>([]);
  const [input, setInput] = useState("");
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        setNickname(user.displayName || "유저");
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "qna"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as QnaItem)));
    });
  }, []);

  const postQuestion = async () => {
    if (!input.trim() || !nickname) return;
    await addDoc(collection(db, "qna"), {
      question: input.trim(),
      askerName: nickname,
      askerUid: uid,
      createdAt: serverTimestamp(),
      answer: null,
      answeredAt: null,
    });
    setInput("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const postAnswer = async (id: string) => {
    const ans = answerInputs[id]?.trim();
    if (!ans) return;
    await updateDoc(doc(db, "qna", id), {
      answer: ans,
      answeredAt: serverTimestamp(),
    });
    setAnswerInputs((prev) => ({ ...prev, [id]: "" }));
    setAnsweringId(null);
  };

  const formatDate = (ts: any) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const isAdmin = nickname === ADMIN;

  return (
    <main className="relative h-screen flex flex-col overflow-hidden">
      <div className="fixed inset-0 bg-gray-50" />

      {/* 헤더 */}
      <div className="relative z-10 flex items-center h-14 px-4 bg-white border-b border-gray-100 shrink-0">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-yellow-50 text-sky-400 font-bold text-lg mr-3">←</button>
        <div>
          <p className="font-black text-slate-800 text-base">Q&amp;A방</p>
          <p className="text-[10px] text-sky-400 font-semibold -mt-0.5">궁금한 게 있으면 질문하세요</p>
        </div>
        {isAdmin && (
          <span className="ml-auto px-3 py-1 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 text-white text-xs font-black shadow-sm">관리자</span>
        )}
      </div>

      {/* 질문 목록 */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {items.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-sky-400 font-semibold text-sm">아직 질문이 없어요</p>
            <p className="text-slate-400 text-xs mt-1">첫 번째 질문을 남겨보세요!</p>
          </div>
        )}

        {items.map((item) => (
          <div key={item.id} className="space-y-2">

            {/* Q */}
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm">Q</div>
              <div className="flex-1 rounded-[18px] rounded-tl-[6px] bg-white border border-gray-100 px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-black text-sky-500">{item.askerName}</p>
                  <p className="text-[10px] text-sky-400">{formatDate(item.createdAt)}</p>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed">{item.question}</p>
              </div>
            </div>

            {/* A — 답변 있을 때 */}
            {item.answer && (
              <div className="flex gap-3 items-start pl-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm">A</div>
                <div className="flex-1 rounded-[18px] rounded-tl-[6px] bg-violet-50 border border-violet-100 px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-black text-violet-500">관리자</p>
                    <p className="text-[10px] text-sky-400">{formatDate(item.answeredAt)}</p>
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed">{item.answer}</p>
                </div>
              </div>
            )}

            {/* A — 미답변 */}
            {!item.answer && (
              <div className="pl-11">
                {isAdmin ? (
                  answeringId === item.id ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        className="flex-1 bg-white/80 border border-violet-200 rounded-[14px] px-3 py-2 text-sm text-slate-800 placeholder:text-sky-400 outline-none"
                        placeholder="답변 입력..."
                        value={answerInputs[item.id] || ""}
                        onChange={(e) => setAnswerInputs((p) => ({ ...p, [item.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && postAnswer(item.id)}
                      />
                      <button onClick={() => postAnswer(item.id)}
                        className="px-4 rounded-[14px] bg-gradient-to-r from-violet-400 to-purple-400 text-white font-black text-xs shadow-sm active:scale-95 transition-transform">
                        등록
                      </button>
                      <button onClick={() => setAnsweringId(null)}
                        className="px-3 rounded-[14px] bg-gray-100 text-sky-400 font-bold text-xs">
                        취소
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setAnsweringId(item.id)}
                      className="text-xs font-black text-violet-400 border border-violet-200 bg-violet-50 rounded-full px-4 py-1.5 active:scale-95 transition-transform">
                      + 답변하기
                    </button>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-sky-400 bg-gray-50 border border-gray-100 rounded-full px-3 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-300 animate-pulse" />
                    답변 대기 중
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* 질문 입력 (관리자 제외) */}
      {!isAdmin && (
        <div className="relative z-10 flex items-center gap-2 px-4 py-3 bg-white border-t border-gray-100 shrink-0">
          <input
            className="flex-1 bg-gray-50 border border-gray-100 rounded-[16px] px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && postQuestion()}
            placeholder="궁금한 점을 질문해 보세요"
          />
          <button onClick={postQuestion}
            className="w-11 h-11 rounded-[14px] bg-gradient-to-r from-sky-400 to-cyan-300 text-white font-black shadow-[0_4px_14px_rgba(56,189,248,0.3)] active:scale-95 transition-transform flex items-center justify-center">
            ▶
          </button>
        </div>
      )}
    </main>
  );
}
