"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import {
  collection, getDocs, query, where, orderBy, doc, getDoc,
} from "firebase/firestore";

type Session = {
  id: string;
  sessionId: string;
  from: string;
  to: string;
  partner: string;
  createdAt: any;
};
type StoryLine = { id: string; by: string; text: string };
type StorySession = Session & { lines: StoryLine[] };
type DrawSession = Session;

export default function GalleryPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [tab, setTab] = useState<"story" | "draw">("story");
  const [stories, setStories] = useState<StorySession[]>([]);
  const [draws, setDraws] = useState<DrawSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [openStory, setOpenStory] = useState<StorySession | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setNickname(snap.data().nickname || "유저");
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!nickname) return;
    loadAll();
  }, [nickname]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadStories(), loadDraws()]);
    setLoading(false);
  };

  const loadStories = async () => {
    const [q1, q2] = await Promise.all([
      getDocs(query(collection(db, "story_requests"), where("from", "==", nickname))),
      getDocs(query(collection(db, "story_requests"), where("to", "==", nickname))),
    ]);
    const all = [...q1.docs, ...q2.docs];
    const ended = all
      .filter(d => d.data().status === "ended")
      .filter((d, i, arr) => arr.findIndex(x => x.id === d.id) === i);

    const sessions: StorySession[] = await Promise.all(
      ended.map(async (d) => {
        const data = d.data();
        const partner = data.from === nickname ? data.to : data.from;
        const linesSnap = await getDocs(
          query(collection(db, "story_sessions", data.sessionId, "lines"), orderBy("createdAt", "asc"))
        );
        const lines = linesSnap.docs.map(l => ({ id: l.id, by: l.data().by, text: l.data().text }));
        return { id: d.id, sessionId: data.sessionId, from: data.from, to: data.to, partner, createdAt: data.createdAt, lines };
      })
    );
    sessions.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    setStories(sessions);
  };

  const loadDraws = async () => {
    const [q1, q2] = await Promise.all([
      getDocs(query(collection(db, "draw_requests"), where("from", "==", nickname))),
      getDocs(query(collection(db, "draw_requests"), where("to", "==", nickname))),
    ]);
    const all = [...q1.docs, ...q2.docs];
    const ended = all
      .filter(d => d.data().status === "ended")
      .filter((d, i, arr) => arr.findIndex(x => x.id === d.id) === i);

    const sessions: DrawSession[] = ended.map(d => {
      const data = d.data();
      const partner = data.from === nickname ? data.to : data.from;
      return { id: d.id, sessionId: data.sessionId, from: data.from, to: data.to, partner, createdAt: data.createdAt };
    });
    sessions.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    setDraws(sessions);
  };

  const formatDate = (ts: any) => {
    if (!ts?.seconds) return "";
    return new Date(ts.seconds * 1000).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen pb-16" style={{ background: "linear-gradient(160deg, #fdf4ff 0%, #fef9ec 50%, #f0f9ff 100%)" }}>
      {/* 배경 블롭 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-80px] right-[-60px] w-72 h-72 rounded-full blur-3xl opacity-25" style={{ background: "#d8b4fe" }} />
        <div className="absolute bottom-[-60px] right-[20%] w-56 h-56 rounded-full blur-3xl opacity-20" style={{ background: "#a5f3fc" }} />
      </div>

      {/* 헤더 */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-12 pb-5">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white/80 border border-purple-100 flex items-center justify-center text-slate-600 text-xl font-bold active:scale-90 transition-transform shadow-sm">
          ‹
        </button>
        <div>
          <h1 className="font-black text-slate-800 text-xl">창작 갤러리</h1>
          <p className="text-slate-400 text-xs">완성된 작품들을 모아봐요</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="relative z-10 px-5 mb-5">
        <div className="flex gap-2 bg-white/60 border border-purple-100 rounded-2xl p-1">
          {(["story", "draw"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${tab === t ? "text-white shadow-sm" : "text-slate-400"}`}
              style={tab === t ? { background: "linear-gradient(135deg, #a855f7, #ec4899)" } : {}}>
              {t === "story" ? "✍️ 스토리" : "🖌️ 협업 그림"}
            </button>
          ))}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="relative z-10 px-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10" style={{ animation: "wagBounce 0.65s infinite" }}>
              <img src="/wag.png" className="w-full h-full object-contain" />
            </div>
          </div>
        ) : tab === "story" ? (
          stories.length === 0 ? (
            <EmptyState text="완성된 스토리가 없어요" sub="친구와 이야기를 이어써봐요 ✍️" />
          ) : stories.map((s) => (
            <button key={s.id} onClick={() => setOpenStory(s)}
              className="w-full rounded-[20px] bg-white/80 border border-purple-100 px-5 py-4 text-left shadow-sm active:scale-[0.98] transition-transform">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-purple-600"
                    style={{ background: "linear-gradient(135deg, #f3e8ff, #fce7f3)" }}>
                    {s.partner[0]}
                  </div>
                  <span className="text-sm font-black text-slate-700">with {s.partner}</span>
                </div>
                <span className="text-xs text-slate-400">{formatDate(s.createdAt)}</span>
              </div>
              <p className="text-slate-400 text-[10px] mb-1.5">{s.lines.length}줄 · 총 {s.lines.reduce((a, l) => a + l.text.length, 0)}자</p>
              {s.lines[0] && (
                <p className="text-slate-700 text-sm leading-relaxed line-clamp-2">
                  {s.lines[0].text}
                </p>
              )}
            </button>
          ))
        ) : (
          draws.length === 0 ? (
            <EmptyState text="완성된 그림이 없어요" sub="친구와 함께 그림을 그려봐요 🖌️" />
          ) : draws.map((d) => (
            <div key={d.id}
              className="w-full rounded-[20px] bg-white/80 border border-purple-100 px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ background: "linear-gradient(135deg, #f3e8ff, #fce7f3)" }}>
                    🎨
                  </div>
                  <div>
                    <p className="font-black text-slate-700 text-sm">with {d.partner}</p>
                    <p className="text-purple-400 text-xs mt-0.5">협업 그림</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">{formatDate(d.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 스토리 전문 모달 */}
      {openStory && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center px-4 pb-0"
          onClick={() => setOpenStory(null)}>
          <div className="w-full max-w-lg rounded-t-[28px] flex flex-col"
            style={{ background: "linear-gradient(180deg, #fdf4ff 0%, #ffffff 100%)", maxHeight: "80vh" }}
            onClick={e => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <div>
                <p className="font-black text-slate-800 text-base">with {openStory.partner}</p>
                <p className="text-slate-400 text-xs">{openStory.lines.length}줄 · {formatDate(openStory.createdAt)}</p>
              </div>
              <button onClick={() => setOpenStory(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 active:scale-90 transition-transform">
                ✕
              </button>
            </div>
            <div className="w-12 h-0.5 rounded-full bg-purple-200 mx-6 mb-4 shrink-0" />
            {/* 스토리 내용 */}
            <div className="overflow-y-auto px-6 pb-8 space-y-4">
              {openStory.lines.map((line, i) => {
                const isMine = line.by === nickname;
                return (
                  <div key={line.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                    <p className="text-slate-400 text-[10px] mb-1 px-1">{line.by} · {i + 1}번째</p>
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed font-medium ${isMine ? "text-white rounded-br-md" : "bg-white/80 border border-purple-100 text-slate-700 rounded-bl-md"}`}
                      style={isMine ? { background: "linear-gradient(135deg, #a855f7, #ec4899)" } : {}}>
                      {line.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes wagBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
      `}</style>
    </div>
  );
}

function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-4xl opacity-40">🎨</p>
      <p className="text-slate-500 font-bold text-sm">{text}</p>
      <p className="text-slate-400 text-xs">{sub}</p>
    </div>
  );
}
