"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, doc, getDoc, getDocs, query, where, onSnapshot } from "firebase/firestore";
import HamburgerMenuWithDelete from "@/components/hamburger";
import TextAvatar from "@/components/TextAvatar";

type Friend = { uid: string; nickname: string; profileImage: string | null };

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
    <main className="relative min-h-screen overflow-hidden bg-[#fff7ef]">
      <HamburgerMenuWithDelete />

      {/* BACKGROUND LIGHT */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-120px] left-[-100px] w-[340px] h-[340px] rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute bottom-[-160px] right-[-120px] w-[420px] h-[420px] rounded-full bg-yellow-200/50 blur-3xl" />
      </div>

      {/* WINDOW LIGHT */}
      <div className="absolute top-0 right-0 w-[55%] h-full bg-gradient-to-l from-white/50 to-transparent pointer-events-none" />

      {/* CONTENT */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-10">
        <div
          className="
            relative w-full max-w-[390px]
            rounded-[42px]
            bg-[#fff9f2]/90
            border border-white/60
            shadow-[0_20px_80px_rgba(255,180,80,0.25)]
            backdrop-blur-xl
            overflow-hidden
          "
        >
          {/* TOP */}
          <div className="relative px-8 pt-10 text-center">
            {/* 프로필 버튼 */}
            <button
              onClick={() => router.push("/profile")}
              className="absolute top-5 right-6"
            >
              <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-orange-200 shadow-md">
                <TextAvatar nickname={nickname} size={44} profileImage={profileImage} />
              </div>
            </button>

            {/* FLOAT ICON */}
            <div className="mx-auto mb-5 relative w-fit">
              <div className="absolute inset-0 bg-orange-300/40 blur-2xl rounded-full" />
              <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-orange-100 to-yellow-100 shadow-lg">
                <span className="text-5xl">💬</span>
              </div>
            </div>

            {/* TITLE */}
            <h1 className="text-[56px] leading-none font-black tracking-[0.18em] text-[#6f4221]">
              WAGIE
            </h1>
            <p className="mt-4 text-[17px] text-[#9d7556]">따뜻한 대화가 시작되는 곳</p>
          </div>

          {/* IMAGE AREA */}
          <div className="relative mt-10 px-6">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-28 rounded-full bg-orange-100/70 blur-2xl" />

            <div className="relative flex items-end justify-center gap-3">
              {/* BIG CHARACTER */}
              <div className="relative">
                <div className="w-44 h-44 rounded-[45%] bg-[#fff7ef] shadow-[0_10px_30px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center relative">
                  <div className="absolute top-5 left-2 w-10 h-16 rounded-full bg-[#fff7ef] rotate-[-25deg]" />
                  <div className="absolute top-5 right-2 w-10 h-16 rounded-full bg-[#fff7ef] rotate-[25deg]" />
                  <div className="flex gap-6 mt-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#6b4d38]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#6b4d38]" />
                  </div>
                  <div className="mt-3 w-4 h-3 rounded-full border-b-[3px] border-[#6b4d38]" />
                  <div className="mt-5 w-20 h-20 rounded-[30px] bg-gradient-to-br from-orange-300 to-amber-300 shadow-lg flex items-center justify-center text-3xl">
                    🧡
                  </div>
                </div>
              </div>

              {/* SMALL CHARACTER */}
              <div className="mb-2">
                <div className="w-24 h-24 rounded-full bg-yellow-200 shadow-lg flex flex-col items-center justify-center">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#6b4d38]" />
                    <div className="w-2 h-2 rounded-full bg-[#6b4d38]" />
                  </div>
                  <div className="mt-2 bg-white rounded-full px-3 py-1 text-xs text-[#6b4d38]">...</div>
                </div>
              </div>
            </div>
          </div>

          {/* HOME MENU */}
          <div className="px-6 pt-8 pb-8 space-y-3">
            {/* 인사말 */}
            <div className="text-center mb-1">
              <p className="text-lg font-bold text-[#6f4221]">
                안녕, <span className="text-orange-500">{nickname}</span>! 👋
              </p>
            </div>

            {/* 친구 버블 */}
            {friends.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-1 justify-center" style={{ scrollbarWidth: "none" }}>
                {friends.slice(0, 5).map((f) => (
                  <button
                    key={f.uid}
                    onClick={() => router.push("/avatar")}
                    className="flex-shrink-0 text-center border-none bg-transparent p-0 cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-white shadow mx-auto">
                      <TextAvatar nickname={f.nickname} size={44} profileImage={f.profileImage} />
                    </div>
                    <p className="text-[9px] text-[#a07060] mt-1 w-11 truncate font-semibold">{f.nickname}</p>
                  </button>
                ))}
              </div>
            )}

            {/* 1:1 채팅 */}
            <button
              onClick={() => router.push("/avatar")}
              className="
                group relative w-full h-16 rounded-2xl
                bg-gradient-to-r from-orange-400 to-amber-300
                text-white text-xl font-bold
                shadow-[0_10px_30px_rgba(255,170,80,0.35)]
                flex items-center justify-center gap-3
                transition duration-200 hover:scale-[1.02] active:scale-95
                overflow-hidden
              "
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition" />
              {dmUnread > 0 && (
                <span className="absolute top-3 right-4 min-w-[22px] h-[22px] bg-white text-orange-500 text-xs font-black rounded-full flex items-center justify-center px-1.5 shadow">
                  {dmUnread > 99 ? "99+" : dmUnread}
                </span>
              )}
              <span className="text-2xl">💬</span>
              <span>1:1 채팅</span>
            </button>

            {/* 단체채팅 + 다이어리 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push("/groupchat")}
                className="relative h-[72px] rounded-2xl bg-gradient-to-br from-yellow-300 to-orange-300 text-white font-bold shadow-md flex flex-col items-start justify-end p-4 active:scale-95 transition overflow-hidden"
              >
                {groupUnread > 0 && (
                  <span className="absolute top-3 right-3 min-w-[20px] h-[20px] bg-white text-yellow-600 text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow">
                    {groupUnread > 99 ? "99+" : groupUnread}
                  </span>
                )}
                <span className="text-xl mb-1">👥</span>
                <span className="text-sm">단체채팅</span>
              </button>

              <button
                onClick={() => router.push("/diary")}
                className="h-[72px] rounded-2xl bg-gradient-to-br from-pink-300 to-rose-400 text-white font-bold shadow-md flex flex-col items-start justify-end p-4 active:scale-95 transition overflow-hidden"
              >
                <span className="text-xl mb-1">📔</span>
                <span className="text-sm">다이어리</span>
              </button>
            </div>

            {/* 친구 목록 */}
            <button
              onClick={() => router.push("/friendmenu")}
              className="w-full h-14 rounded-2xl bg-white/80 border border-orange-100 text-[#6f4221] font-semibold text-base shadow-sm flex items-center justify-between px-5 active:scale-95 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🤝</span>
                <span>친구 목록</span>
              </div>
              <span className="text-orange-300 text-2xl font-light">›</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
