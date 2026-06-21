"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, deleteDoc, doc, getDoc,
  query, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";

type Notice = { id: string; title: string; content: string; createdAt?: any };

export default function AdminNoticePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [adminModeOn, setAdminModeOn] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);

  useEffect(() => {
    setAdminModeOn(localStorage.getItem("stellaAdminMode") === "true");
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setNickname(null); return; }
      const snap = await getDoc(doc(db, "users", user.uid));
      setNickname(snap.exists() ? (snap.data().nickname ?? null) : null);
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

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrateResult(null);
    try {
      const user = auth.currentUser;
      if (!user) { setMigrateResult("❌ 로그인 필요"); return; }
      const idToken = await user.getIdToken();
      const res = await fetch("/api/migrate-nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, from: "관리자", to: "Stella" }),
      });
      const data = await res.json();
      setMigrateResult(data.ok ? `✅ 완료! ${data.updated}개 업데이트됨` : `❌ 실패: ${data.error}`);
    } finally {
      setMigrating(false);
    }
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
  if (nickname !== "Stella" || !adminModeOn) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 font-semibold">접근 권한이 없어요.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="flex items-center h-14 px-4 bg-white">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-50 text-sky-600 font-bold text-lg mr-3">←</button>
        <span className="font-black text-slate-800 text-base">공지사항 관리</span>
      </div>

      <div className="px-5 pt-6 pb-20 space-y-5">
        {/* 닉네임 마이그레이션 (임시) */}
        <div className="rounded-[24px] bg-orange-50 border border-orange-200 p-5 space-y-3">
          <p className="font-black text-orange-700 text-sm">⚠️ 닉네임 복구 (임시)</p>
          <p className="text-xs text-orange-600">관리자 → Stella 채팅 데이터 마이그레이션</p>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="w-full py-3 rounded-xl bg-orange-400 text-white font-black text-sm disabled:opacity-40"
          >
            {migrating ? "마이그레이션 중..." : "지금 복구하기"}
          </button>
          {migrateResult && <p className="text-sm font-bold text-center text-orange-700">{migrateResult}</p>}
        </div>

        {/* 작성 폼 */}
        <div className="rounded-[24px] bg-white p-5 space-y-3">
          <p className="font-black text-slate-800 text-sm">새 공지 작성</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-400"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            rows={5}
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-400 resize-none"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !title.trim() || !content.trim()}
            className="w-full py-3 rounded-xl bg-sky-200 text-white font-black text-sm disabled:opacity-40"
          >
            {adding ? "등록 중..." : "공지 등록"}
          </button>
        </div>

        {/* 공지 목록 */}
        {notices.length > 0 && (
          <div className="space-y-3">
            <p className="font-black text-slate-800 text-sm px-1">등록된 공지 ({notices.length})</p>
            {notices.map((n) => (
              <div key={n.id} className="rounded-[20px] bg-white px-5 py-4">
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
