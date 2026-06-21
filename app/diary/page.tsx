"use client";

import { useEffect, useState } from "react";
import PageContainer from "@/components/PageContainer";
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
    "😊": "bg-yellow-200", "🥰": "bg-sky-200",
    "😢": "from-blue-200",     "😡": "from-red-200",
    "😴": "from-indigo-200","🤔": "from-slate-200",
    "🥳": "from-fuchsia-200", "😌": "from-green-200",
    "🫠": "bg-yellow-200", "💪": "bg-yellow-200",
  };

  return (
    <PageContainer>
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gray-50" />

      <div className="relative z-10">
        {/* 헤더 */}
        <div className="px-4 py-4">
          <div className="text-xl font-black bg-yellow-200">DIARY</div>
        </div>

        {/* 탭 */}
        <div className="mx-5 mt-4 flex bg-white/70 backdrop-blur-sm rounded-[18px] p-1 gap-1">
          {(["mine", "friends"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-[14px] text-sm font-black transition-all ${
                tab === t
                  ? "bg-sky-200 text-white"
                  : "text-sky-600"
              }`}>
              {t === "mine" ? "내 일기" : "친구 일기"}
            </button>
          ))}
        </div>

        <div className="px-5 pb-10 mt-4">
          {tab === "mine" && (
            <>
              {/* 오늘 일기 */}
              <div className="rounded-[24px] bg-white p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-black text-[#d4904a] tracking-widest">TODAY</p>
                    <p className="font-black text-slate-800 text-sm mt-0.5">{formatDate(today)}</p>
                  </div>
                  {todayEntry && !editing && (
                    <button onClick={() => setEditing(true)}
                      className="px-3 py-1.5 rounded-full bg-sky-50 text-sky-600 text-xs font-black">수정 ✏️</button>
                  )}
                </div>

                {todayEntry && !editing ? (
                  <div className={`bg-sky-50 rounded-[20px] p-4`}>
                    <div className="text-3xl mb-2">{todayEntry.mood}</div>
                    <p className="text-slate-800 text-sm leading-relaxed">{todayEntry.content}</p>
                    <p className="mt-3 text-xs text-sky-600 font-semibold">{todayEntry.isPublic ? "🌍 공개" : "🔒 비공개"}</p>
                  </div>
                ) : (
                  <>
                    {/* 기분 선택 */}
                    <div className="flex gap-2 flex-wrap mb-4">
                      {MOODS.map((m) => (
                        <button key={m} onClick={() => setSelectedMood(m)}
                          className={`text-2xl w-11 h-11 rounded-[14px] transition-all ${
                            selectedMood === m
                              ? "bg-sky-200 scale-110"
                              : "bg-sky-50/50 hover:bg-sky-50"
                          }`}>
                          {m}
                        </button>
                      ))}
                    </div>

                    <textarea value={content} onChange={(e) => setContent(e.target.value)}
                      placeholder="오늘 하루는 어땠어? ✍️" maxLength={200} rows={3}
                      className="w-full text-sm text-slate-800 bg-sky-50/60 rounded-[16px] px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-orange-200 placeholder:text-slate-400"
                    />
                    <div className="text-right text-xs text-slate-400 mb-3">{content.length}/200</div>

                    <div className="flex items-center justify-between">
                      <button onClick={() => setIsPublic(!isPublic)}
                        className={`text-xs px-4 py-2 rounded-full font-black transition-all border ${
                          isPublic ? "bg-sky-50 border-sky-300 text-sky-600" : "bg-gray-50 border-gray-200 text-gray-500"
                        }`}>
                        {isPublic ? "🌍 공개" : "🔒 비공개"}
                      </button>
                      <button onClick={handleSave} disabled={saving || !content.trim()}
                        className="px-6 py-2.5 bg-sky-200 text-white text-sm font-black rounded-full disabled:opacity-40 active:scale-[0.97] transition-transform">
                        {saving ? "저장 중..." : "저장 💾"}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 과거 일기 */}
              <p className="font-black text-slate-800 text-sm mb-3 px-1">지난 일기 📖</p>
              <div className="space-y-3">
                {myEntries.filter((e) => e.date !== today).map((entry) => (
                  <div key={entry.id}
                    className={`bg-sky-50 rounded-[22px] p-4`}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs text-[#9d7060] font-semibold">{formatDate(entry.date)}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-sky-600">{entry.isPublic ? "🌍" : "🔒"}</span>
                        <span className="text-2xl">{entry.mood}</span>
                      </div>
                    </div>
                    <p className="text-slate-800 text-sm leading-relaxed">{entry.content}</p>
                  </div>
                ))}
                {myEntries.filter((e) => e.date !== today).length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-10">아직 지난 일기가 없어요 🌙</div>
                )}
              </div>
            </>
          )}

          {tab === "friends" && (
            <div className="space-y-3">
              {friendEntries.map((entry) => (
                <div key={entry.id}
                  className={`bg-sky-50 rounded-[22px] p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    {entry.profileImage ? (
                      <img src={entry.profileImage} className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-sky-200 flex items-center justify-center text-sm font-black text-sky-600 shadow">
                        {entry.nickname[0]}
                      </div>
                    )}
                    <span className="font-black text-slate-800 text-sm">{entry.nickname}</span>
                    <span className="text-xs text-sky-600 ml-auto">{formatDate(entry.date)}</span>
                    <span className="text-2xl">{entry.mood}</span>
                  </div>
                  <p className="text-slate-800 text-sm leading-relaxed">{entry.content}</p>
                </div>
              ))}
              {friendEntries.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-10">친구들의 공개 일기가 없어요 🌸</div>
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
    </PageContainer>
  );
}
