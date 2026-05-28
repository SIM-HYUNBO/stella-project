"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/app/firebase";
import {
  collection, doc, getDoc, getDocs, query, where, updateDoc,
} from "firebase/firestore";

type Title = {
  id: string;
  icon: string;
  name: string;
  desc: string;
  condition: string;
  color: string;
  earned: boolean;
};

const ALL_TITLES = [
  { id: "newcomer",    icon: "🌱", name: "새싹",       desc: "WAGIE에 처음 왔어요",         condition: "가입만 해도",        color: "from-green-400 to-emerald-400" },
  { id: "talker",      icon: "💬", name: "수다쟁이",    desc: "메시지 10개 이상 보냄",         condition: "메시지 10개",        color: "from-blue-400 to-cyan-400" },
  { id: "chatterer",   icon: "🗣️", name: "채팅왕",      desc: "메시지 50개 이상 보냄",         condition: "메시지 50개",        color: "from-orange-400 to-amber-400" },
  { id: "talkmaster",  icon: "👑", name: "말왕",        desc: "메시지 200개 이상 보냄",        condition: "메시지 200개",       color: "from-yellow-400 to-orange-400" },
  { id: "talkgod",     icon: "⚡", name: "말신",        desc: "메시지 500개 이상 보냄",        condition: "메시지 500개",       color: "from-violet-500 to-purple-500" },
  { id: "friendly",    icon: "🤝", name: "친화력 갑",   desc: "친구 3명 이상",                 condition: "친구 3명",           color: "from-pink-400 to-rose-400" },
  { id: "popular",     icon: "😎", name: "인싸",        desc: "친구 7명 이상",                 condition: "친구 7명",           color: "from-indigo-400 to-blue-500" },
  { id: "richfriend",  icon: "💎", name: "친구부자",    desc: "친구 15명 이상",                condition: "친구 15명",          color: "from-cyan-400 to-teal-400" },
  { id: "partyperson", icon: "🎉", name: "파티피플",    desc: "단체 채팅방 2개 이상 참여",     condition: "단체방 2개",         color: "from-fuchsia-400 to-pink-500" },
  { id: "groupmaster", icon: "🎪", name: "방장",        desc: "단체 채팅방 3개 이상 참여",     condition: "단체방 3개",         color: "from-amber-400 to-yellow-300" },
  { id: "nightowl",    icon: "🦉", name: "야행성",      desc: "자정 이후 메시지 보냄",         condition: "자정 이후 접속",     color: "from-slate-500 to-gray-600" },
  { id: "legend",      icon: "🌟", name: "레전드",      desc: "모든 칭호 10개 이상 획득",      condition: "칭호 10개",          color: "from-orange-400 via-pink-400 to-violet-400" },
];

export default function TitlesPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [titles, setTitles] = useState<Title[]>([]);
  const [equipped, setEquipped] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) return;
      const data = snap.data();
      const nick = data.nickname || "유저";
      setNickname(nick);
      setEquipped(data.title || null);
      await computeTitles(user.uid, nick, data.title || null);
    });
    return () => unsub();
  }, []);

  const computeTitles = async (userId: string, nick: string, currentTitle: string | null) => {
    // 메시지 수
    const msgSnap = await getDocs(query(collection(db, "messages"), where("from", "==", nick)));
    const msgCount = msgSnap.size;

    // 친구 수
    const friendSnap = await getDocs(query(collection(db, "friends"), where("users", "array-contains", userId)));
    const friendCount = friendSnap.size;

    // 단체방 수
    const groupSnap = await getDocs(query(collection(db, "group_rooms"), where("members", "array-contains", nick)));
    const groupCount = groupSnap.size;

    // 자정 메시지 여부
    let nightOwl = false;
    msgSnap.forEach((d) => {
      const ts = d.data().createdAt?.toDate?.();
      if (ts) {
        const h = ts.getHours();
        if (h >= 0 && h < 4) nightOwl = true;
      }
    });

    const earned = new Set<string>();
    earned.add("newcomer");
    if (msgCount >= 10)  earned.add("talker");
    if (msgCount >= 50)  earned.add("chatterer");
    if (msgCount >= 200) earned.add("talkmaster");
    if (msgCount >= 500) earned.add("talkgod");
    if (friendCount >= 3)  earned.add("friendly");
    if (friendCount >= 7)  earned.add("popular");
    if (friendCount >= 15) earned.add("richfriend");
    if (groupCount >= 2) earned.add("partyperson");
    if (groupCount >= 3) earned.add("groupmaster");
    if (nightOwl)        earned.add("nightowl");
    if (earned.size >= 10) earned.add("legend");

    setTitles(ALL_TITLES.map((t) => ({ ...t, earned: earned.has(t.id) })));
    setLoading(false);
  };

  const equipTitle = async (titleId: string) => {
    if (!uid) return;
    const title = ALL_TITLES.find((t) => t.id === titleId);
    if (!title) return;
    const newTitle = equipped === titleId ? null : titleId;
    await updateDoc(doc(db, "users", uid), { title: newTitle });
    setEquipped(newTitle);
  };

  const earnedTitles = titles.filter((t) => t.earned);
  const lockedTitles = titles.filter((t) => !t.earned);
  const equippedTitle = ALL_TITLES.find((t) => t.id === equipped);

  return (
    <div className="min-h-screen bg-[#fff7ef]">
      {/* 헤더 */}
      <div className="sticky top-0 z-20 flex items-center h-14 px-4 bg-white border-b border-gray-100">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-400 font-bold text-lg mr-3">←</button>
        <span className="font-black text-gray-800 text-base">🎫 칭호</span>
      </div>

      <div className="px-4 pt-5 pb-24 space-y-6">

        {/* 현재 장착 칭호 */}
        <div className={`rounded-[28px] overflow-hidden shadow-[0_8px_30px_rgba(255,160,50,0.3)]`}>
          <div className={`bg-gradient-to-r ${equippedTitle?.color || "from-gray-300 to-gray-400"} p-6 relative`}>
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <p className="text-white/80 text-xs font-black tracking-widest mb-2">현재 칭호</p>
            {equippedTitle ? (
              <>
                <p className="text-5xl mb-2">{equippedTitle.icon}</p>
                <p className="text-white font-black text-2xl">{equippedTitle.name}</p>
                <p className="text-white/75 text-sm mt-1">{equippedTitle.desc}</p>
              </>
            ) : (
              <>
                <p className="text-5xl mb-2">🫥</p>
                <p className="text-white font-black text-2xl">없음</p>
                <p className="text-white/75 text-sm mt-1">아래에서 칭호를 장착해보세요</p>
              </>
            )}
          </div>
          <div className="bg-white px-5 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-500 font-semibold">획득한 칭호 <span className="text-orange-400 font-black">{earnedTitles.length}</span> / {titles.length}</p>
            <div className="flex gap-1">
              {earnedTitles.slice(0, 5).map((t) => (
                <span key={t.id} className="text-lg">{t.icon}</span>
              ))}
              {earnedTitles.length > 5 && <span className="text-xs text-gray-400 font-bold self-center">+{earnedTitles.length - 5}</span>}
            </div>
          </div>
        </div>

        {/* 획득한 칭호 */}
        {!loading && earnedTitles.length > 0 && (
          <div>
            <p className="font-black text-gray-800 text-base px-1 mb-3">✅ 획득한 칭호</p>
            <div className="grid grid-cols-2 gap-3">
              {earnedTitles.map((t) => (
                <button key={t.id} onClick={() => equipTitle(t.id)}
                  className={`rounded-[20px] overflow-hidden shadow-sm active:scale-95 transition-transform ${equipped === t.id ? "ring-2 ring-orange-400 ring-offset-2" : ""}`}>
                  <div className={`bg-gradient-to-br ${t.color} px-4 py-4 relative`}>
                    <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
                    {equipped === t.id && (
                      <span className="absolute top-2 right-2 text-xs bg-white/30 text-white font-black px-2 py-0.5 rounded-full">장착중</span>
                    )}
                    <p className="text-3xl mb-2">{t.icon}</p>
                    <p className="text-white font-black text-sm">{t.name}</p>
                    <p className="text-white/70 text-[10px] mt-0.5">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 잠긴 칭호 */}
        {!loading && lockedTitles.length > 0 && (
          <div>
            <p className="font-black text-gray-800 text-base px-1 mb-3">🔒 잠긴 칭호</p>
            <div className="grid grid-cols-2 gap-3">
              {lockedTitles.map((t) => (
                <div key={t.id} className="rounded-[20px] bg-white border border-gray-100 px-4 py-4 opacity-60 shadow-sm">
                  <p className="text-3xl mb-2 grayscale">{t.icon}</p>
                  <p className="text-gray-500 font-black text-sm">{t.name}</p>
                  <p className="text-gray-400 text-[10px] mt-1">🔒 {t.condition}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-400 animate-spin" />
          </div>
        )}

      </div>
    </div>
  );
}
