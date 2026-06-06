"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, doc, getDoc, getDocs, query, where, onSnapshot } from "firebase/firestore";
import PageContainer from "@/components/PageContainer";
import TextAvatar from "@/components/TextAvatar";

const TITLE_MAP: Record<string, { icon: string; name: string }> = {
  newcomer:    { icon: "🌱", name: "새싹" },
  talker:      { icon: "💬", name: "수다쟁이" },
  chatterer:   { icon: "🗣️", name: "채팅왕" },
  talkmaster:  { icon: "👑", name: "말왕" },
  talkgod:     { icon: "⚡", name: "말신" },
  friendly:    { icon: "🤝", name: "친화력 갑" },
  richfriend:  { icon: "💎", name: "친구부자" },
  popular:     { icon: "😎", name: "인싸" },
  partyperson: { icon: "🎉", name: "파티피플" },
  groupmaster: { icon: "🎪", name: "방장" },
  nightowl:    { icon: "🦉", name: "야행성" },
  legend:      { icon: "🌟", name: "레전드" },
};

type Friend = { uid: string; nickname: string; profileImage: string | null };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return "밤이 깊었어요 🌙";
  if (h < 12) return "좋은 아침이에요 🌅";
  if (h < 18) return "좋은 오후예요 ☀️";
  return "좋은 저녁이에요 🌆";
}

function getTodayQuote() {
  const quotes = [
    "오늘도 빛나는 하루예요 🌟",
    "작은 대화가 큰 힘이 돼요 💬",
    "친구가 있어 든든해요 🤝",
    "오늘 하루도 수고했어요 🧡",
    "좋은 사람과 함께라면 충분해요 ✨",
  ];
  return quotes[new Date().getDay() % quotes.length];
}

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [dmUnread, setDmUnread] = useState(0);
  const [groupUnread, setGroupUnread] = useState(0);
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setNickname(snap.data().nickname || "유저");
        setProfileImage(snap.data().profileImage || null);
        setTitle(snap.data().title || null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const fSnap = await getDocs(query(collection(db, "friends"), where("users", "array-contains", uid)));
      const list: Friend[] = [];
      for (const d of fSnap.docs) {
        const otherUid = d.data().users.find((u: string) => u !== uid);
        if (!otherUid) continue;
        const uSnap = await getDoc(doc(db, "users", otherUid));
        if (uSnap.exists()) list.push({ uid: otherUid, nickname: uSnap.data().nickname, profileImage: uSnap.data().profileImage || null });
      }
      list.sort((a, b) => (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko"));
      setFriends(list);
    })();
  }, [uid]);

  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "messages"), where("to", "==", nickname));
    return onSnapshot(q, (snap) => {
      let n = 0;
      snap.forEach((d) => { const data = d.data(); if (data.from !== nickname && !data.readBy?.includes(nickname)) n++; });
      setDmUnread(n);
    });
  }, [nickname]);

  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "group_rooms"), where("members", "array-contains", nickname));
    return onSnapshot(q, async (snap) => {
      let total = 0;
      for (const d of snap.docs) {
        const msgSnap = await getDocs(collection(db, "group_rooms", d.id, "messages"));
        msgSnap.forEach((m) => { const data = m.data(); if (data.from !== nickname && !data.readBy?.includes(nickname)) total++; });
      }
      setGroupUnread(total);
    });
  }, [nickname]);

  if (!nickname) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF0]">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-[5px] border-amber-100" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border-[5px] border-transparent border-t-amber-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="relative min-h-screen overflow-hidden -m-4">

        {/* 배경 */}
        <div className="fixed inset-0 bg-gradient-to-b from-[#FFFBF0] via-[#FFF8E8] to-[#FFF5DC] -z-10" />
        <div className="fixed top-[-100px] right-[-100px] w-[360px] h-[360px] rounded-full bg-amber-200/30 blur-[100px] -z-10" />
        <div className="fixed bottom-[-80px] left-[-60px] w-[320px] h-[320px] rounded-full bg-yellow-200/30 blur-[100px] -z-10" />

        <div className="px-4 pt-3 pb-24 space-y-5">

          {/* ── 히어로 카드 ── */}
          <div className="relative rounded-[28px] overflow-hidden shadow-xl shadow-amber-200">
            <div className="bg-gradient-to-br from-amber-800 via-amber-700 to-amber-500 p-6 relative">
              <div className="absolute top-0 right-0 w-52 h-52 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />
              <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.10)_50%,transparent_60%)] animate-[shimmer_4s_infinite]" />

              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-semibold mb-1">{getGreeting()}</p>
                  <h1 className="text-4xl font-black text-white leading-tight">
                    안녕,<br />{nickname} 👋
                  </h1>
                  {title && TITLE_MAP[title] && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                      <span className="text-sm">{TITLE_MAP[title].icon}</span>
                      <span className="text-white text-xs font-black">{TITLE_MAP[title].name}</span>
                    </div>
                  )}
                </div>
                <button onClick={() => router.push("/profile")} className="shrink-0">
                  <div className="relative w-[80px] h-[80px] flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-[spinSlow_6s_linear_infinite]" />
                    <div className="absolute w-[68px] h-[68px] rounded-full border-2 border-white/20 animate-[spinSlow_4s_linear_infinite_reverse]" />
                    <div className="w-[64px] h-[64px] rounded-full overflow-hidden relative z-10">
                      <TextAvatar nickname={nickname} size={64} profileImage={profileImage} />
                    </div>
                  </div>
                </button>
              </div>

              {/* 스탯 칩 */}
              <div className="relative mt-5 flex gap-2.5">
                {[
                  { val: dmUnread || 0,    label: "안 읽은 DM",  icon: "💬" },
                  { val: groupUnread || 0, label: "단체 미확인", icon: "👥" },
                  { val: friends.length,   label: "친구",        icon: "🤝" },
                ].map(({ val, label, icon }) => (
                  <div key={label} className="flex-1 bg-white/15 backdrop-blur-sm rounded-2xl px-2 py-3 text-center">
                    <p className="text-lg mb-0.5">{icon}</p>
                    <p className="text-white font-black text-xl leading-none">{val}</p>
                    <p className="text-white/75 text-[10px] font-semibold mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 오늘의 한마디 */}
            <div className="bg-white px-5 py-3 flex items-center gap-2 border-t border-amber-50">
              <span className="text-base">💡</span>
              <p className="text-amber-700 text-xs font-semibold">{getTodayQuote()}</p>
            </div>
          </div>

          {/* ── 친구 버블 ── */}
          {friends.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="font-black text-stone-800 text-base">친구들 👫</p>
                <button onClick={() => router.push("/friendmenu")} className="text-xs text-amber-600 font-bold">전체보기 →</button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {friends.map((f) => (
                  <button key={f.uid} onClick={() => router.push("/avatar")}
                    className="flex-shrink-0 text-center bg-transparent border-none p-0 cursor-pointer">
                    <div className="relative mx-auto w-14 h-14">
                      <div className="relative w-14 h-14 rounded-full overflow-hidden ring-[3px] ring-amber-200 shadow-sm">
                        <TextAvatar nickname={f.nickname} size={56} profileImage={f.profileImage} />
                      </div>
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1.5 w-14 truncate font-semibold">{f.nickname}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── 빠른 액션 ── */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: "💬", label: "DM 보내기", bg: "bg-gradient-to-br from-amber-700 to-amber-500",  shadow: "shadow-amber-200",  path: "/avatar" },
              { icon: "👥", label: "단체방",     bg: "bg-gradient-to-br from-yellow-500 to-amber-400", shadow: "shadow-yellow-200", path: "/groupchat" },
              { icon: "📔", label: "일기 쓰기",  bg: "bg-gradient-to-br from-amber-800 to-amber-600",  shadow: "shadow-amber-200",  path: "/diary" },
            ].map(({ icon, label, bg, shadow, path }) => (
              <button key={label} onClick={() => router.push(path)}
                className={`rounded-[20px] ${bg} px-3 py-4 text-center active:scale-[0.97] transition-transform shadow-md ${shadow}`}>
                <p className="text-2xl mb-1">{icon}</p>
                <p className="text-white font-black text-xs">{label}</p>
              </button>
            ))}
          </div>

          {/* ── 메뉴 ── */}
          <div>
            <p className="font-black text-stone-800 text-base mb-3 px-1">메뉴 ✨</p>
            <div className="space-y-3">

              {/* 1:1 채팅 */}
              <button onClick={() => router.push("/avatar")}
                className="group relative w-full rounded-[24px] overflow-hidden active:scale-[0.98] transition-transform">
                <div className="bg-gradient-to-r from-amber-700 to-amber-500 px-6 py-5 flex items-center gap-4 relative shadow-lg shadow-amber-200">
                  <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.10)_50%,transparent_60%)] animate-[shimmer_4s_infinite]" />
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
                  <div className="relative w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shrink-0">💬</div>
                  <div className="relative text-left flex-1">
                    <p className="text-white font-black text-xl">1:1 채팅</p>
                    <p className="text-white/70 text-sm">친구와 나만의 대화</p>
                  </div>
                  {dmUnread > 0 && (
                    <span className="relative bg-white text-amber-700 font-black text-sm rounded-full min-w-[32px] h-8 flex items-center justify-center px-2 shadow animate-[pulse_2s_infinite]">
                      {dmUnread > 99 ? "99+" : dmUnread}
                    </span>
                  )}
                </div>
              </button>

              {/* 단체채팅 + 다이어리 */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => router.push("/groupchat")}
                  className="relative rounded-[22px] overflow-hidden active:scale-[0.97] transition-transform">
                  <div className="bg-gradient-to-br from-yellow-500 to-amber-400 px-5 py-5 relative shadow-md shadow-yellow-200">
                    <div className="absolute top-[-16px] right-[-16px] w-20 h-20 rounded-full bg-white/15" />
                    <div className="w-11 h-11 rounded-xl bg-white/25 flex items-center justify-center text-2xl mb-3">👥</div>
                    <p className="text-white font-black text-base">단체채팅</p>
                    <p className="text-white/70 text-xs mt-0.5">같이 얘기해요</p>
                    {groupUnread > 0 && (
                      <span className="absolute top-3 right-3 bg-white text-amber-700 font-black text-xs rounded-full min-w-[24px] h-6 flex items-center justify-center px-1.5 shadow animate-[pulse_2s_infinite]">
                        {groupUnread > 99 ? "99+" : groupUnread}
                      </span>
                    )}
                  </div>
                </button>

                <button onClick={() => router.push("/diary")}
                  className="rounded-[22px] overflow-hidden active:scale-[0.97] transition-transform relative">
                  <div className="bg-gradient-to-br from-amber-800 to-amber-600 px-5 py-5 relative shadow-md shadow-amber-200">
                    <div className="absolute top-[-16px] right-[-16px] w-20 h-20 rounded-full bg-white/15" />
                    <div className="w-11 h-11 rounded-xl bg-white/25 flex items-center justify-center text-2xl mb-3">📔</div>
                    <p className="text-white font-black text-base">다이어리</p>
                    <p className="text-white/70 text-xs mt-0.5">오늘을 기록해요</p>
                  </div>
                </button>
              </div>

              {/* 친구목록 */}
              <button onClick={() => router.push("/friendmenu")}
                className="w-full rounded-[22px] overflow-hidden active:scale-[0.98] transition-transform">
                <div className="bg-white shadow-[0_4px_16px_rgba(120,53,15,0.08)] border border-amber-50 px-6 py-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl shadow-sm">🤝</div>
                  <div className="text-left flex-1">
                    <p className="text-stone-800 font-black text-base">친구 목록</p>
                    <p className="text-amber-600 text-sm">친구 {friends.length}명과 함께해요</p>
                  </div>
                  <span className="text-amber-300 text-xl">›</span>
                </div>
              </button>

              {/* 회의방 */}
              <button onClick={() => router.push("/meetingroom")}
                className="w-full rounded-[22px] overflow-hidden active:scale-[0.98] transition-transform">
                <div className="bg-white shadow-[0_4px_16px_rgba(120,53,15,0.08)] border border-amber-50 px-6 py-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center text-2xl shadow-sm">📋</div>
                  <div className="text-left flex-1">
                    <p className="text-stone-800 font-black text-base">회의방</p>
                    <p className="text-amber-600 text-sm">주제 고정 · 긴급회의 알림</p>
                  </div>
                  <span className="text-yellow-400 text-xl">›</span>
                </div>
              </button>

              {/* 칭호 */}
              <button onClick={() => router.push("/titles")}
                className="w-full rounded-[22px] overflow-hidden active:scale-[0.98] transition-transform">
                <div className="bg-white shadow-[0_4px_16px_rgba(120,53,15,0.08)] border border-amber-50 px-6 py-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl shadow-sm">🎫</div>
                  <div className="text-left flex-1">
                    <p className="text-stone-800 font-black text-base">칭호</p>
                    <p className="text-amber-600 text-sm">활동하면 칭호를 획득해요</p>
                  </div>
                  <span className="text-amber-300 text-xl">›</span>
                </div>
              </button>

              {/* Q&A방 */}
              <button onClick={() => router.push("/tools/contact")}
                className="w-full rounded-[22px] overflow-hidden active:scale-[0.98] transition-transform">
                <div className="bg-white shadow-[0_4px_16px_rgba(120,53,15,0.08)] border border-amber-50 px-6 py-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl shadow-sm">🎧</div>
                  <div className="text-left flex-1">
                    <p className="text-stone-800 font-black text-base">Q&A방</p>
                    <p className="text-amber-600 text-sm">궁금한 점을 남겨보세요</p>
                  </div>
                  <span className="text-amber-300 text-xl">›</span>
                </div>
              </button>

            </div>
          </div>

          <div className="text-center py-4">
            <p className="text-amber-400 text-sm font-medium">✦ 따뜻한 대화가 시작되는 곳 ✦</p>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes floatA { 0%{transform:translate(0,0) rotate(0deg)} 100%{transform:translate(-28px,36px) rotate(8deg)} }
        @keyframes floatB { 0%{transform:translate(0,0) rotate(0deg)} 100%{transform:translate(36px,-28px) rotate(-6deg)} }
        @keyframes floatC { 0%{transform:translate(0,0) rotate(0deg)} 100%{transform:translate(-18px,22px) rotate(4deg)} }
        @keyframes floatD { 0%{transform:translate(0,0)} 100%{transform:translate(-22px,-32px)} }
        @keyframes floatE { 0%{transform:translate(0,0)} 100%{transform:translate(18px,28px)} }
        @keyframes spinSlow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes spinSlowReverse { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </PageContainer>
  );
}
