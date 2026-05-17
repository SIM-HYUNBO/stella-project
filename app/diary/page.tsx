"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";

const MOODS = ["😊", "🥰", "😢", "😡", "😴", "🤔", "🥳", "😌", "🫠", "💪"];

const PASTEL_COLORS = [
  "from-pink-100 to-rose-50",
  "from-purple-100 to-violet-50",
  "from-blue-100 to-sky-50",
  "from-green-100 to-emerald-50",
  "from-yellow-100 to-amber-50",
  "from-orange-100 to-red-50",
];

type DiaryEntry = {
  id: string;
  uid: string;
  nickname: string;
  profileImage?: string;
  date: string;
  content: string;
  mood: string;
  isPublic: boolean;
  createdAt: number;
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

  useEffect(() => {
    if (!user) return;
    loadMyEntries();
  }, [user]);

  useEffect(() => {
    if (!user || tab !== "friends") return;
    loadFriendEntries();
  }, [user, tab]);

  const loadMyEntries = async () => {
    const q = query(
      collection(db, "diaries"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const snap = await getDocs(q);
    const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DiaryEntry));
    setMyEntries(entries);

    const te = entries.find((e) => e.date === today);
    if (te) {
      setTodayEntry(te);
      setSelectedMood(te.mood);
      setContent(te.content);
      setIsPublic(te.isPublic);
    }
  };

  const loadFriendEntries = async () => {
    const friendSnap = await getDocs(
      query(collection(db, "friends"), where("users", "array-contains", user.uid))
    );
    const friendUids = friendSnap.docs.flatMap((d) => {
      const users: string[] = d.data().users || [];
      return users.filter((u) => u !== user.uid);
    });

    if (friendUids.length === 0) { setFriendEntries([]); return; }

    const chunks: DiaryEntry[] = [];
    for (let i = 0; i < friendUids.length; i += 10) {
      const chunk = friendUids.slice(i, i + 10);
      const q = query(
        collection(db, "diaries"),
        where("uid", "in", chunk),
        where("isPublic", "==", true),
        orderBy("createdAt", "desc"),
        limit(30)
      );
      const snap = await getDocs(q);
      snap.docs.forEach((d) => chunks.push({ id: d.id, ...d.data() } as DiaryEntry));
    }
    chunks.sort((a, b) => b.createdAt - a.createdAt);
    setFriendEntries(chunks);
  };

  const handleSave = async () => {
    if (!user || !content.trim()) return;
    setSaving(true);
    const id = `${user.uid}_${today}`;
    await setDoc(doc(db, "diaries", id), {
      uid: user.uid,
      nickname,
      profileImage: profileImage || "",
      date: today,
      content: content.trim(),
      mood: selectedMood,
      isPublic,
      createdAt: Date.now(),
    });
    await loadMyEntries();
    setEditing(false);
    setSaving(false);
  };

  const colorFor = (date: string) => {
    const sum = date.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return PASTEL_COLORS[sum % PASTEL_COLORS.length];
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-pink-50 to-violet-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white/70 backdrop-blur-md border-b border-pink-100 px-5 py-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">
          ← 뒤로
        </button>
        <h1 className="text-lg font-bold text-violet-500">✨ 미니 다이어리</h1>
        <div className="w-10" />
      </div>

      {/* 탭 */}
      <div className="flex mx-5 mt-5 bg-white/60 rounded-2xl p-1 gap-1">
        {(["mine", "friends"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t
                ? "bg-violet-400 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t === "mine" ? "내 일기" : "친구 일기"}
          </button>
        ))}
      </div>

      <div className="px-5 pb-10">
        {tab === "mine" && (
          <>
            {/* 오늘 일기 작성 */}
            <div className="mt-5 bg-white rounded-3xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-500">
                  {formatDate(today)} 오늘
                </span>
                {todayEntry && !editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-xs text-violet-400 hover:text-violet-600"
                  >
                    수정
                  </button>
                )}
              </div>

              {todayEntry && !editing ? (
                /* 오늘 이미 씀 */
                <div className={`bg-gradient-to-br ${colorFor(today)} rounded-2xl p-4`}>
                  <div className="text-3xl mb-2">{todayEntry.mood}</div>
                  <p className="text-gray-700 text-sm leading-relaxed">{todayEntry.content}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {todayEntry.isPublic ? "🌍 공개" : "🔒 비공개"}
                    </span>
                  </div>
                </div>
              ) : (
                /* 작성 폼 */
                <>
                  {/* 기분 선택 */}
                  <div className="flex gap-2 flex-wrap mb-3">
                    {MOODS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedMood(m)}
                        className={`text-2xl w-10 h-10 rounded-xl transition-all ${
                          selectedMood === m
                            ? "bg-violet-100 scale-110 shadow-sm"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="오늘 하루는 어땠어? ✍️"
                    maxLength={200}
                    rows={3}
                    className="w-full text-sm text-gray-700 bg-gray-50 rounded-2xl px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-violet-200"
                  />
                  <div className="text-right text-xs text-gray-300 -mt-1 mb-3">
                    {content.length}/200
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setIsPublic(!isPublic)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                        isPublic
                          ? "bg-violet-100 text-violet-500"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {isPublic ? "🌍 공개" : "🔒 비공개"}
                    </button>

                    <button
                      onClick={handleSave}
                      disabled={saving || !content.trim()}
                      className="bg-violet-400 text-white text-sm px-5 py-2 rounded-xl font-semibold disabled:opacity-40 hover:bg-violet-500 transition-all"
                    >
                      {saving ? "저장 중..." : "저장"}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 과거 일기 */}
            <div className="mt-6 space-y-3">
              {myEntries
                .filter((e) => e.date !== today)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className={`bg-gradient-to-br ${colorFor(entry.date)} rounded-3xl p-4 shadow-sm`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs text-gray-400 font-medium">
                        {formatDate(entry.date)}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-300">
                          {entry.isPublic ? "🌍" : "🔒"}
                        </span>
                        <span className="text-xl">{entry.mood}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-gray-700 text-sm leading-relaxed">{entry.content}</p>
                  </div>
                ))}
              {myEntries.filter((e) => e.date !== today).length === 0 && (
                <div className="text-center text-gray-300 text-sm py-10">
                  아직 일기가 없어요 🌙
                </div>
              )}
            </div>
          </>
        )}

        {tab === "friends" && (
          <div className="mt-5 space-y-3">
            {friendEntries.map((entry) => (
              <div
                key={entry.id}
                className={`bg-gradient-to-br ${colorFor(entry.date)} rounded-3xl p-4 shadow-sm`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {entry.profileImage ? (
                    <img src={entry.profileImage} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-violet-200 flex items-center justify-center text-xs font-bold text-violet-500">
                      {entry.nickname[0]}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-gray-600">{entry.nickname}</span>
                  <span className="text-xs text-gray-400 ml-auto">{formatDate(entry.date)}</span>
                  <span className="text-xl">{entry.mood}</span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{entry.content}</p>
              </div>
            ))}
            {friendEntries.length === 0 && (
              <div className="text-center text-gray-300 text-sm py-10">
                친구들의 공개 일기가 없어요 🌸
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
