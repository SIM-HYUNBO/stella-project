"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, setDoc, query, where, limit } from "firebase/firestore";

const MOODS = ["😊", "🥰", "😢", "😡", "😴", "🤔", "🥳", "😌", "🫠", "💪"];

type DiaryEntry = {
  id: string; uid: string; nickname: string; profileImage?: string;
  date: string; content: string; mood: string; isPublic: boolean; createdAt: number;
};

export default function DiaryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [nickname, setNickname] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [tab, setTab] = useState<"mine" | "friends">("mine");
  const [selectedMood, setSelectedMood] = useState("😊");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myEntries, setMyEntries] = useState<DiaryEntry[]>([]);
  const [friendEntries, setFriendEntries] = useState<DiaryEntry[]>([]);
  const [todayEntry, setTodayEntry] = useState<DiaryEntry | null>(null);
  const [editing, setEditing] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        setNickname(snap.data().nickname || "");
        setProfileImage(snap.data().profileImage || null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => { if (user) loadMyEntries(); }, [user]);
  useEffect(() => { if (user && tab === "friends") loadFriendEntries(); }, [user, tab]);

  const loadMyEntries = async () => {
    try {
      const snap = await getDocs(query(collection(db, "diaries"), where("uid", "==", user.uid), limit(30)));
      const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DiaryEntry)).sort((a, b) => b.createdAt - a.createdAt);
      setMyEntries(entries);
      const te = entries.find((e) => e.date === today);
      if (te) { setTodayEntry(te); setSelectedMood(te.mood); setContent(te.content); setIsPublic(te.isPublic); }
    } catch (e) { console.error(e); }
  };

  const loadFriendEntries = async () => {
    const friendSnap = await getDocs(query(collection(db, "friends"), where("users", "array-contains", user.uid)));
    const friendUids = friendSnap.docs.flatMap((d) => (d.data().users as string[]).filter((u) => u !== user.uid));
    if (friendUids.length === 0) { setFriendEntries([]); return; }
    const chunks: DiaryEntry[] = [];
    for (let i = 0; i < friendUids.length; i += 10) {
      const snap = await getDocs(query(collection(db, "diaries"), where("uid", "in", friendUids.slice(i, i + 10)), where("isPublic", "==", true), limit(50)));
      snap.docs.forEach((d) => chunks.push({ id: d.id, ...d.data() } as DiaryEntry));
    }
    setFriendEntries(chunks.sort((a, b) => b.createdAt - a.createdAt).slice(0, 30));
  };

  const handleSave = async () => {
    if (!user || !content.trim()) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "diaries", `${user.uid}_${today}`), {
        uid: user.uid, nickname, profileImage: profileImage || "",
        date: today, content: content.trim(), mood: selectedMood, isPublic, createdAt: Date.now(),
      });
      await loadMyEntries();
      setEditing(false);
    } catch { alert("저장 실패 ㅠ"); }
    finally { setSaving(false); }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  const moodBg: Record<string, string> = {
    "😊": "from-amber-200 to-yellow-100", "🥰": "from-pink-200 to-rose-100",
    "😢": "from-blue-200 to-sky-100",     "😡": "from-red-200 to-orange-100",
    "😴": "from-indigo-200 to-violet-100","🤔": "from-slate-200 to-gray-100",
    "🥳": "from-fuchsia-200 to-pink-100", "😌": "from-green-200 to-emerald-100",
    "🫠": "from-orange-200 to-amber-100", "💪": "from-yellow-200 to-lime-100",
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-[#fff6ee] via-[#fff0e0] to-[#fff8f0]" />
      <div className="fixed top-[-160px] right-[-160px] w-[500px] h-[500px] rounded-full bg-orange-300/20 blur-[100px] animate-[floatA_10s_ease-in-out_infinite_alternate]" />
      <div className="fixed bottom-[-200px] left-[-160px] w-[480px] h-[480px] rounded-full bg-yellow-300/20 blur-[100px] animate-[floatB_13s_ease-in-out_infinite_alternate]" />
      <div className="fixed top-[35%] left-[20%] w-[300px] h-[300px] rounded-full bg-pink-200/15 blur-[80px] animate-[floatC_9s_ease-in-out_infinite_alternate]" />

      <div className="relative z-10">
        {/* 헤더 */}
        <div className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 bg-white/70 backdrop-blur-md border-b border-orange-100">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-400 font-bold text-lg">←</button>
          <span className="font-black text-[#3d1f00] text-base">📔 미니 다이어리</span>
          <div className="w-9" />
        </div>

        {/* 탭 */}
        <div className="mx-5 mt-4 flex bg-white/70 backdrop-blur-sm border border-orange-100 rounded-[18px] p-1 gap-1 shadow-sm">
          {(["mine", "friends"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-[14px] text-sm font-black transition-all ${
                tab === t
                  ? "bg-gradient-to-r from-orange-400 to-amber-300 text-white shadow-md"
                  : "text-[#c09070]"
              }`}>
              {t === "mine" ? "내 일기" : "친구 일기"}
            </button>
          ))}
        </div>

        <div className="px-5 pb-10 mt-4">
          {tab === "mine" && (
            <>
              {/* 오늘 일기 */}
              <div className="rounded-[24px] bg-white/80 backdrop-blur-sm border border-orange-100 shadow-[0_8px_30px_rgba(255,150,80,0.12)] p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-black text-[#d4904a] tracking-widest">TODAY</p>
                    <p className="font-black text-[#3d1f00] text-sm mt-0.5">{formatDate(today)}</p>
                  </div>
                  {todayEntry && !editing && (
                    <button onClick={() => setEditing(true)}
                      className="px-3 py-1.5 rounded-full bg-orange-50 text-orange-400 text-xs font-black border border-orange-100">수정 ✏️</button>
                  )}
                </div>

                {todayEntry && !editing ? (
                  <div className={`bg-gradient-to-br ${moodBg[todayEntry.mood] || "from-orange-100 to-amber-50"} rounded-[20px] p-4`}>
                    <div className="text-3xl mb-2">{todayEntry.mood}</div>
                    <p className="text-[#3d1f00] text-sm leading-relaxed">{todayEntry.content}</p>
                    <p className="mt-3 text-xs text-[#c09070] font-semibold">{todayEntry.isPublic ? "🌍 공개" : "🔒 비공개"}</p>
                  </div>
                ) : (
                  <>
                    {/* 기분 선택 */}
                    <div className="flex gap-2 flex-wrap mb-4">
                      {MOODS.map((m) => (
                        <button key={m} onClick={() => setSelectedMood(m)}
                          className={`text-2xl w-11 h-11 rounded-[14px] transition-all ${
                            selectedMood === m
                              ? "bg-gradient-to-br from-orange-100 to-amber-100 scale-110 shadow-md ring-2 ring-orange-300"
                              : "bg-orange-50/50 hover:bg-orange-50"
                          }`}>
                          {m}
                        </button>
                      ))}
                    </div>

                    <textarea value={content} onChange={(e) => setContent(e.target.value)}
                      placeholder="오늘 하루는 어땠어? ✍️" maxLength={200} rows={3}
                      className="w-full text-sm text-[#3d1f00] bg-orange-50/60 border border-orange-100 rounded-[16px] px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-orange-200 placeholder:text-[#d4a07a]"
                    />
                    <div className="text-right text-xs text-[#d4a07a] mb-3">{content.length}/200</div>

                    <div className="flex items-center justify-between">
                      <button onClick={() => setIsPublic(!isPublic)}
                        className={`text-xs px-4 py-2 rounded-full font-black transition-all border ${
                          isPublic ? "bg-orange-50 border-orange-200 text-orange-500" : "bg-gray-50 border-gray-200 text-gray-500"
                        }`}>
                        {isPublic ? "🌍 공개" : "🔒 비공개"}
                      </button>
                      <button onClick={handleSave} disabled={saving || !content.trim()}
                        className="px-6 py-2.5 bg-gradient-to-r from-orange-400 to-amber-300 text-white text-sm font-black rounded-full shadow-md disabled:opacity-40 active:scale-[0.97] transition-transform">
                        {saving ? "저장 중..." : "저장 💾"}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 과거 일기 */}
              <p className="font-black text-[#3d1f00] text-sm mb-3 px-1">지난 일기 📖</p>
              <div className="space-y-3">
                {myEntries.filter((e) => e.date !== today).map((entry) => (
                  <div key={entry.id}
                    className={`bg-gradient-to-br ${moodBg[entry.mood] || "from-orange-100 to-amber-50"} rounded-[22px] p-4 shadow-sm`}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs text-[#9d7060] font-semibold">{formatDate(entry.date)}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[#c09070]">{entry.isPublic ? "🌍" : "🔒"}</span>
                        <span className="text-2xl">{entry.mood}</span>
                      </div>
                    </div>
                    <p className="text-[#3d1f00] text-sm leading-relaxed">{entry.content}</p>
                  </div>
                ))}
                {myEntries.filter((e) => e.date !== today).length === 0 && (
                  <div className="text-center text-[#d4a07a] text-sm py-10">아직 지난 일기가 없어요 🌙</div>
                )}
              </div>
            </>
          )}

          {tab === "friends" && (
            <div className="space-y-3">
              {friendEntries.map((entry) => (
                <div key={entry.id}
                  className={`bg-gradient-to-br ${moodBg[entry.mood] || "from-orange-100 to-amber-50"} rounded-[22px] p-4 shadow-sm`}>
                  <div className="flex items-center gap-2 mb-3">
                    {entry.profileImage ? (
                      <img src={entry.profileImage} className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-200 to-amber-200 flex items-center justify-center text-sm font-black text-orange-500 shadow">
                        {entry.nickname[0]}
                      </div>
                    )}
                    <span className="font-black text-[#3d1f00] text-sm">{entry.nickname}</span>
                    <span className="text-xs text-[#c09070] ml-auto">{formatDate(entry.date)}</span>
                    <span className="text-2xl">{entry.mood}</span>
                  </div>
                  <p className="text-[#3d1f00] text-sm leading-relaxed">{entry.content}</p>
                </div>
              ))}
              {friendEntries.length === 0 && (
                <div className="text-center text-[#d4a07a] text-sm py-10">친구들의 공개 일기가 없어요 🌸</div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes floatA { 0%{transform:translate(0,0)} 100%{transform:translate(-30px,40px)} }
        @keyframes floatB { 0%{transform:translate(0,0)} 100%{transform:translate(40px,-30px)} }
        @keyframes floatC { 0%{transform:translate(0,0)} 100%{transform:translate(-20px,25px)} }
      `}</style>
    </main>
  );
}
