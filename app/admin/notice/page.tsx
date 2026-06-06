"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/app/firebase";
import { watchAuthState } from "@/app/authService";
import {
  collection, addDoc, deleteDoc, doc,
  query, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";

type Notice = { id: string; title: string; content: string; createdAt?: any };

export default function AdminNoticePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const unsub = watchAuthState((user: any) => {
      setNickname(user?.displayName ?? null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setNotices(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notice)));
    });
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) return;
    setAdding(true);
    await addDoc(collection(db, "announcements"), {
      title: title.trim(),
      content: content.trim(),
      createdAt: serverTimestamp(),
    });
    setTitle("");
    setContent("");
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "announcements", id));
  };

  const formatDate = (ts: any) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  if (nickname === null) return null;
  if (nickname !== "관리자") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 font-semibold">접근 권한이 없어요.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="flex items-center h-14 px-4 bg-white border-b border-gray-100">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-yellow-50 text-sky-400 font-bold text-lg mr-3">←</button>
        <span className="font-black text-slate-800 text-base">공지사항 관리</span>
      </div>

      <div className="px-5 pt-6 pb-20 space-y-5">
        {/* 작성 폼 */}
        <div className="rounded-[24px] bg-white border border-sky-100 shadow-sm p-5 space-y-3">
          <p className="font-black text-slate-800 text-sm">새 공지 작성</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-300"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-300 resize-none"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !title.trim() || !content.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 text-white font-black text-sm disabled:opacity-40"
          >
            {adding ? "등록 중..." : "공지 등록"}
          </button>
        </div>

        {/* 공지 목록 */}
        {notices.length > 0 && (
          <div className="space-y-3">
            <p className="font-black text-slate-800 text-sm px-1">등록된 공지 ({notices.length})</p>
            {notices.map((n) => (
              <div key={n.id} className="rounded-[20px] bg-white border border-gray-100 shadow-sm px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 text-sm">{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(n.createdAt)}</p>
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{n.content}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="shrink-0 w-8 h-8 rounded-xl bg-red-50 text-red-400 font-black text-sm flex items-center justify-center"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {notices.length === 0 && (
          <p className="text-center text-sm text-gray-400 pt-4">등록된 공지가 없어요.</p>
        )}
      </div>
    </main>
  );
}
