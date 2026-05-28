"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  collection, doc, getDoc, getDocs,
  query, where, orderBy, limit, onSnapshot,
} from "firebase/firestore";
import PageContainer from "@/components/PageContainer";
import TextAvatar from "@/components/TextAvatar";

type DmRoom = {
  friendNickname: string;
  friendUid: string;
  profileImage: string | null;
  lastMsg: string;
  lastAt: number;
  unread: number;
};

type GroupRoom = {
  id: string;
  name: string;
  members: string[];
  profileImage: string | null;
  lastMsg: string;
  lastAt: number;
  unread: number;
};

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [dmRooms, setDmRooms] = useState<DmRoom[]>([]);
  const [groupRooms, setGroupRooms] = useState<GroupRoom[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      setNickname(snap.exists() ? snap.data().nickname || "유저" : "유저");
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!nickname || !uid) return;
    const loadDm = async () => {
      const fSnap = await getDocs(query(collection(db, "friends"), where("users", "array-contains", uid)));
      const rooms: DmRoom[] = [];
      for (const d of fSnap.docs) {
        const friendUid = d.data().users.find((u: string) => u !== uid);
        if (!friendUid) continue;
        const uSnap = await getDoc(doc(db, "users", friendUid));
        if (!uSnap.exists()) continue;
        const friendNickname: string = uSnap.data().nickname;
        const profileImage: string | null = uSnap.data().profileImage || null;
        let lastMsg = "대화를 시작해보세요";
        let lastAt = 0;
        let unread = 0;
        try {
          const [sentSnap, recvSnap] = await Promise.all([
            getDocs(query(collection(db, "messages"), where("from", "==", nickname), where("to", "==", friendNickname))),
            getDocs(query(collection(db, "messages"), where("from", "==", friendNickname), where("to", "==", nickname))),
          ]);
          const all: any[] = [];
          sentSnap.forEach((m) => all.push(m.data()));
          recvSnap.forEach((m) => {
            const data = m.data();
            all.push(data);
            if (!data.readBy?.includes(nickname)) unread++;
          });
          if (all.length > 0) {
            all.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
            const latest = all[0];
            lastMsg = latest.type === "image" ? "🖼 사진" : (latest.content || "");
            lastAt = latest.createdAt?.toMillis?.() || 0;
          }
        } catch { /* silent */ }
        rooms.push({ friendNickname, friendUid, profileImage, lastMsg, lastAt, unread });
      }
      rooms.sort((a, b) => b.lastAt - a.lastAt);
      setDmRooms(rooms);
    };
    loadDm();
  }, [nickname, uid]);

  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "group_rooms"), where("members", "array-contains", nickname));
    return onSnapshot(q, async (snap) => {
      const rooms: GroupRoom[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        let lastMsg = "대화를 시작해보세요";
        let lastAt = data.createdAt?.toMillis?.() || 0;
        let unread = 0;
        const msgSnap = await getDocs(
          query(collection(db, "group_rooms", d.id, "messages"), orderBy("createdAt", "desc"), limit(1))
        );
        msgSnap.forEach((m) => {
          const mData = m.data();
          lastMsg = mData.type === "image" ? "🖼 사진" : (mData.content || "");
          lastAt = mData.createdAt?.toMillis?.() || lastAt;
          if (mData.from !== nickname && !mData.readBy?.includes(nickname)) unread++;
        });
        rooms.push({ id: d.id, name: data.name, members: data.members || [], profileImage: data.profileImage || null, lastMsg, lastAt, unread });
      }
      rooms.sort((a, b) => b.lastAt - a.lastAt);
      setGroupRooms(rooms);
    });
  }, [nickname]);

  const formatTime = (ms: number) => {
    if (!ms) return "";
    const diff = Date.now() - ms;
    if (diff < 60000) return "방금";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${Math.floor(diff / 86400000)}일 전`;
  };

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

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));
  const totalUnread = dmRooms.reduce((s, r) => s + r.unread, 0) + groupRooms.reduce((s, r) => s + r.unread, 0);

  return (
    <PageContainer>
      <div className="min-h-screen bg-[#fff7ef] -m-4">

        {/* 히어로 헤더 */}
        <div className="relative overflow-hidden px-5 pt-7 pb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300" />
          <div className="absolute top-[-30px] right-[-30px] w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute bottom-[-20px] left-[-20px] w-28 h-28 rounded-full bg-white/10" />
          <div className="relative">
            <p className="text-white/80 text-xs font-bold tracking-widest">안녕하세요 👋</p>
            <p className="text-white text-2xl font-black mt-0.5 drop-shadow-sm">{nickname} 님</p>
            {totalUnread > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/25 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-xs font-black">읽지 않은 메시지 {totalUnread}개</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pt-5 pb-24 space-y-6">

          {/* 1:1 채팅 */}
          <section>
            <div className="flex items-center gap-2 px-1 mb-3">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-orange-400 to-amber-300" />
              <p className="text-sm font-black text-gray-800">1:1 채팅</p>
              {dmRooms.length > 0 && (
                <span className="ml-auto text-xs font-black text-orange-400">{dmRooms.length}개</span>
              )}
            </div>

            {dmRooms.length === 0 ? (
              <div className="bg-white rounded-2xl border border-orange-100 px-5 py-7 text-center shadow-sm">
                <p className="text-3xl mb-2">💬</p>
                <p className="text-gray-400 text-sm font-semibold">참여 중인 1:1 채팅이 없어요</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dmRooms.map((r) => {
                  const id = `dm-${r.friendUid}`;
                  const isOpen = openId === id;
                  return (
                    <div key={id} className="rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(255,150,80,0.12)] border border-orange-100 bg-white">
                      <button onClick={() => toggle(id)} className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-orange-50 transition-colors">
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-orange-200">
                            <TextAvatar nickname={r.friendNickname} size={48} profileImage={r.profileImage} />
                          </div>
                          {r.unread > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-orange-400 to-amber-300 text-white text-[10px] font-black flex items-center justify-center shadow-md">
                              {r.unread > 9 ? "9+" : r.unread}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-black text-gray-800 text-sm">{r.friendNickname}</p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{r.lastMsg}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <p className="text-[10px] text-gray-300">{formatTime(r.lastAt)}</p>
                          <span className={`text-orange-300 text-sm transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▾</span>
                        </div>
                      </button>
                      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-24" : "max-h-0"}`}>
                        <div className="px-4 pb-4 flex items-center justify-between border-t border-orange-50">
                          <p className="text-xs text-gray-400 mt-3">{r.friendNickname}님과의 1:1 대화방</p>
                          <button
                            onClick={() => router.push(`/avatar?open=${encodeURIComponent(r.friendNickname)}`)}
                            className="mt-3 px-5 py-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-300 text-white font-black text-sm shadow-md active:scale-95 transition-transform">
                            열기
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 단체 채팅 */}
          <section>
            <div className="flex items-center gap-2 px-1 mb-3">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-400 to-yellow-300" />
              <p className="text-sm font-black text-gray-800">단체 채팅</p>
              {groupRooms.length > 0 && (
                <span className="ml-auto text-xs font-black text-amber-500">{groupRooms.length}개</span>
              )}
            </div>

            {groupRooms.length === 0 ? (
              <div className="bg-white rounded-2xl border border-orange-100 px-5 py-7 text-center shadow-sm">
                <p className="text-3xl mb-2">👥</p>
                <p className="text-gray-400 text-sm font-semibold">참여 중인 단체 채팅이 없어요</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {groupRooms.map((r) => {
                  const id = `group-${r.id}`;
                  const isOpen = openId === id;
                  return (
                    <div key={id} className="rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(255,150,80,0.12)] border border-orange-100 bg-white">
                      <button onClick={() => toggle(id)} className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-orange-50 transition-colors">
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-amber-200 bg-gradient-to-br from-orange-300 to-amber-300 flex items-center justify-center font-black text-white text-lg">
                            {r.profileImage
                              ? <img src={r.profileImage} alt={r.name} className="w-full h-full object-cover" />
                              : r.name[0]}
                          </div>
                          {r.unread > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-orange-400 to-amber-300 text-white text-[10px] font-black flex items-center justify-center shadow-md">
                              {r.unread > 9 ? "9+" : r.unread}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <p className="font-black text-gray-800 text-sm">{r.name}</p>
                            <span className="text-[10px] text-orange-400 bg-orange-50 rounded-full px-1.5 py-0.5 font-bold">{r.members.length}명</span>
                          </div>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{r.lastMsg}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <p className="text-[10px] text-gray-300">{formatTime(r.lastAt)}</p>
                          <span className={`text-orange-300 text-sm transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▾</span>
                        </div>
                      </button>
                      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-24" : "max-h-0"}`}>
                        <div className="px-4 pb-4 flex items-center justify-between border-t border-orange-50">
                          <p className="text-xs text-gray-400 mt-3">멤버 {r.members.length}명 · {r.members.slice(0, 3).join(", ")}{r.members.length > 3 ? " 외" : ""}</p>
                          <button
                            onClick={() => router.push(`/groupchat?room=${r.id}`)}
                            className="mt-3 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-white font-black text-sm shadow-md active:scale-95 transition-transform">
                            열기
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </div>
    </PageContainer>
  );
}
