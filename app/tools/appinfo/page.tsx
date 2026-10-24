"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import pkg from "@/package.json";

type Notice = { id: string; title: string; content: string; createdAt?: any };

export default function AppInfoPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [nickname, setNickname] = useState<string | null>(null);
  const [adminModeOn, setAdminModeOn] = useState(false);

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

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (ts: any) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gray-50" />

      <div className="relative z-10">
        {/* 헤더 */}
        <div className="flex items-center h-14 px-4 bg-white">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-50 text-sky-600 font-bold text-lg mr-3">←</button>
          <span className="font-black text-slate-800 text-base">앱 정보</span>
          {nickname === "Stella" && adminModeOn && (
            <button
              onClick={() => router.push("/admin/notice")}
              className="ml-auto text-xs font-black text-sky-600 bg-sky-50 px-3 py-1.5 rounded-xl"
            >
              관리
            </button>
          )}
        </div>

        <div className="px-5 pt-8 pb-16 space-y-5">

          {/* 히어로 */}
          <div className="rounded-[28px] bg-sky-200 px-6 py-7 relative overflow-hidden text-center">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.12)_50%,transparent_60%)] animate-[shimmer_4s_infinite]" />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-white/25 text-4xl mb-4">💬</div>
              <h1 className="text-white font-black text-3xl tracking-widest">WAGIE</h1>
              <p className="text-white/75 text-sm mt-1">따뜻한 대화가 시작되는 곳</p>
            </div>
          </div>

          {/* 정보 카드 */}
          <div className="rounded-[24px] bg-white overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-sky-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-200 flex items-center justify-center text-xl">📦</div>
                <span className="font-semibold text-slate-800 text-sm">버전</span>
              </div>
              <span className="text-sky-600 text-sm font-bold bg-sky-50 px-3 py-1 rounded-full">v{pkg.version}</span>
            </div>

            <button onClick={() => router.push("/tools/contact")}
              className="w-full px-5 py-4 flex items-center justify-between active:bg-sky-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-200 flex items-center justify-center text-xl">🎧</div>
                <span className="font-semibold text-slate-800 text-sm">Q&A방</span>
              </div>
              <span className="text-orange-300 text-xl">›</span>
            </button>
          </div>

          {/* 공지사항 */}
          <div className="rounded-[24px] bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-sky-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-200 flex items-center justify-center text-xl">📢</div>
              <span className="font-black text-slate-800 text-sm">공지사항</span>
            </div>

            {notices.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-gray-400">등록된 공지가 없어요.</div>
            ) : (
              <div className="divide-y divide-orange-50">
                {notices.map((n) => (
                  <div key={n.id}>
                    <button
                      onClick={() => toggle(n.id)}
                      className="w-full px-5 py-4 flex items-center justify-between active:bg-sky-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-semibold text-slate-800 text-sm truncate">{n.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(n.createdAt)}</p>
                      </div>
                      <span className="text-orange-300 text-lg ml-3 shrink-0 transition-transform duration-200"
                        style={{ display: "inline-block", transform: expanded[n.id] ? "rotate(180deg)" : "rotate(0deg)" }}>
                        ▼
                      </span>
                    </button>
                    {expanded[n.id] && (
                      <div className="px-5 pb-4 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {n.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 태그라인 */}
          <p className="text-center text-sm text-[#d4a57a] font-medium pt-4">✦ Made with 🧡 by WAGIE Team ✦</p>

        </div>
      </div>

      <style>{`
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </main>
  );
}
