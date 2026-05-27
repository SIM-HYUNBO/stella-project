"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, doc, getDoc, getDocs, query, where, onSnapshot } from "firebase/firestore";
import PageContainer from "@/components/PageContainer";
import TextAvatar from "@/components/TextAvatar";

type Friend = { uid: string; nickname: string; profileImage: string | null };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return "밤이 깊었어요 🌙";
  if (h < 12) return "좋은 아침이에요 🌅";
  if (h < 18) return "좋은 오후예요 ☀️";
  return "좋은 저녁이에요 🌆";
}

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [dmUnread, setDmUnread] = useState(0);
  const [groupUnread, setGroupUnread] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setNickname(snap.data().nickname || "유저");
        setProfileImage(snap.data().profileImage || null);
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
      <div className="min-h-screen flex items-center justify-center bg-[#fff7ef]">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-[6px] border-orange-200" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border-[6px] border-transparent border-t-orange-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="relative min-h-screen overflow-hidden -m-4">

        {/* ── 배경 ── */}
        <div className="fixed inset-0 bg-gradient-to-br from-[#fff6ee] via-[#fff0e0] to-[#fff8f0] -z-10" />
        <div className="fixed top-[-160px] right-[-160px] w-[500px] h-[500px] rounded-full bg-orange-300/20 blur-[100px] -z-10 animate-[floatA_10s_ease-in-out_infinite_alternate]" />
        <div className="fixed bottom-[-200px] left-[-160px] w-[480px] h-[480px] rounded-full bg-yellow-300/20 blur-[100px] -z-10 animate-[floatB_13s_ease-in-out_infinite_alternate]" />
        <div className="fixed top-[35%] left-[20%] w-[300px] h-[300px] rounded-full bg-pink-200/15 blur-[80px] -z-10 animate-[floatC_8s_ease-in-out_infinite_alternate]" />

        <div className="px-5 pt-4 pb-20 space-y-7">

          {/* ── 히어로 ── */}
          <div className="relative rounded-[32px] overflow-hidden bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 p-6 shadow-[0_20px_60px_rgba(255,160,50,0.4)]">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />

            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-semibold mb-1">{getGreeting()}</p>
                <h1 className="text-4xl font-black text-white leading-tight">
                  안녕,<br />{nickname} 👋
                </h1>
                <p className="text-white/70 text-sm mt-2 font-medium">오늘도 좋은 하루 보내요</p>
              </div>
              <button onClick={() => router.push("/profile")} className="shrink-0">
                <div className="w-[72px] h-[72px] rounded-full overflow-hidden ring-4 ring-white/50 shadow-xl">
                  <TextAvatar nickname={nickname} size={72} profileImage={profileImage} />
                </div>
              </button>
            </div>

            {/* 스탯 */}
            <div className="relative mt-5 flex gap-3">
              <div className="flex-1 bg-white/25 backdrop-blur-sm rounded-2xl px-4 py-3 text-center">
                <p className="text-white font-black text-2xl">{dmUnread || 0}</p>
                <p className="text-white/80 text-xs font-semibold mt-0.5">안 읽은 DM</p>
              </div>
              <div className="flex-1 bg-white/25 backdrop-blur-sm rounded-2xl px-4 py-3 text-center">
                <p className="text-white font-black text-2xl">{groupUnread || 0}</p>
                <p className="text-white/80 text-xs font-semibold mt-0.5">단체 미확인</p>
              </div>
              <div className="flex-1 bg-white/25 backdrop-blur-sm rounded-2xl px-4 py-3 text-center">
                <p className="text-white font-black text-2xl">{friends.length}</p>
                <p className="text-white/80 text-xs font-semibold mt-0.5">친구</p>
              </div>
            </div>
          </div>

          {/* ── 친구 버블 ── */}
          {friends.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="font-black text-[#3d1f00] text-base">친구들 👫</p>
                <button onClick={() => router.push("/friendmenu")} className="text-xs text-orange-400 font-bold">전체보기 →</button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {friends.map((f) => (
                  <button key={f.uid} onClick={() => router.push("/avatar")}
                    className="flex-shrink-0 text-center bg-transparent border-none p-0 cursor-pointer">
                    <div className="relative mx-auto w-14 h-14 rounded-full overflow-hidden ring-[3px] ring-orange-200 shadow-lg">
                      <TextAvatar nickname={f.nickname} size={56} profileImage={f.profileImage} />
                    </div>
                    <p className="text-[10px] text-[#a07060] mt-1.5 w-14 truncate font-semibold">{f.nickname}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── 메뉴 ── */}
          <div>
            <p className="font-black text-[#3d1f00] text-base mb-3 px-1">메뉴 ✨</p>
            <div className="space-y-3">

              {/* 1:1 채팅 */}
              <button onClick={() => router.push("/avatar")}
                className="group relative w-full rounded-[26px] overflow-hidden shadow-[0_12px_40px_rgba(255,100,60,0.28)] active:scale-[0.98] transition-transform">
                <div className="bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 px-6 py-5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shrink-0 shadow-inner">💬</div>
                  <div className="text-left flex-1">
                    <p className="text-white font-black text-xl">1:1 채팅</p>
                    <p className="text-white/70 text-sm">친구와 나만의 대화</p>
                  </div>
                  {dmUnread > 0 && (
                    <span className="bg-white text-orange-500 font-black text-sm rounded-full min-w-[32px] h-8 flex items-center justify-center px-2 shadow-lg">
                      {dmUnread > 99 ? "99+" : dmUnread}
                    </span>
                  )}
                </div>
              </button>

              {/* 단체채팅 + 다이어리 */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => router.push("/groupchat")}
                  className="relative rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(255,180,30,0.3)] active:scale-[0.97] transition-transform">
                  <div className="bg-gradient-to-br from-yellow-400 to-orange-400 px-5 py-5">
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl mb-3">👥</div>
                    <p className="text-white font-black text-base">단체채팅</p>
                    <p className="text-white/70 text-xs mt-0.5">같이 얘기해요</p>
                    {groupUnread > 0 && (
                      <span className="absolute top-3 right-3 bg-white text-yellow-600 font-black text-xs rounded-full min-w-[24px] h-6 flex items-center justify-center px-1.5 shadow">
                        {groupUnread > 99 ? "99+" : groupUnread}
                      </span>
                    )}
                  </div>
                </button>

                <button onClick={() => router.push("/diary")}
                  className="rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(255,100,160,0.28)] active:scale-[0.97] transition-transform">
                  <div className="bg-gradient-to-br from-pink-400 to-rose-500 px-5 py-5">
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl mb-3">📔</div>
                    <p className="text-white font-black text-base">다이어리</p>
                    <p className="text-white/70 text-xs mt-0.5">오늘을 기록해요</p>
                  </div>
                </button>
              </div>

              {/* 친구목록 */}
              <button onClick={() => router.push("/friendmenu")}
                className="w-full rounded-[24px] overflow-hidden shadow-[0_6px_24px_rgba(255,150,80,0.15)] active:scale-[0.98] transition-transform">
                <div className="bg-white/90 backdrop-blur-sm border border-orange-100 px-6 py-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-200 to-amber-200 flex items-center justify-center text-2xl shadow">🤝</div>
                  <div className="text-left flex-1">
                    <p className="text-[#3d1f00] font-black text-base">친구 목록</p>
                    <p className="text-[#c09070] text-sm">친구 {friends.length}명과 함께해요</p>
                  </div>
                  <span className="text-orange-300 text-2xl">›</span>
                </div>
              </button>

            </div>
          </div>

          {/* ── 하단 태그라인 ── */}
          <div className="text-center py-4">
            <p className="text-[#d4a57a] text-sm font-medium">✦ 따뜻한 대화가 시작되는 곳 ✦</p>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes floatA { 0%{transform:translate(0,0)} 100%{transform:translate(-30px,40px)} }
        @keyframes floatB { 0%{transform:translate(0,0)} 100%{transform:translate(40px,-30px)} }
        @keyframes floatC { 0%{transform:translate(0,0)} 100%{transform:translate(-20px,25px)} }
      `}</style>
    </PageContainer>
  );
}
