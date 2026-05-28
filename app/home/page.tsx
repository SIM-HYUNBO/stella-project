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

  /* ── 로그인 ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      setNickname(snap.exists() ? snap.data().nickname || "유저" : "유저");
    });
    return () => unsub();
  }, []);

  /* ── 1:1 채팅방 ── */
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

        // 마지막 메시지
        const msgQ = query(
          collection(db, "messages"),
          where("from", "in", [nickname, friendNickname]),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const msgSnap = await getDocs(msgQ);
        let lastMsg = "대화를 시작해보세요";
        let lastAt = 0;
        let unread = 0;

        msgSnap.forEach((m) => {
          const data = m.data();
          if (
            (data.from === nickname && data.to === friendNickname) ||
            (data.from === friendNickname && data.to === nickname)
          ) {
            lastMsg = data.type === "image" ? "🖼 사진" : (data.content || "");
            lastAt = data.createdAt?.toMillis?.() || 0;
          }
        });

        // 안 읽은 수
        const unreadQ = query(
          collection(db, "messages"),
          where("from", "==", friendNickname),
          where("to", "==", nickname)
        );
        const unreadSnap = await getDocs(unreadQ);
        unreadSnap.forEach((m) => {
          if (!m.data().readBy?.includes(nickname)) unread++;
        });

        rooms.push({ friendNickname, friendUid, profileImage, lastMsg, lastAt, unread });
      }

      rooms.sort((a, b) => b.lastAt - a.lastAt);
      setDmRooms(rooms);
    };

    loadDm();
  }, [nickname, uid]);

  /* ── 단체 채팅방 ── */
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

        rooms.push({
          id: d.id,
          name: data.name,
          members: data.members || [],
          profileImage: data.profileImage || null,
          lastMsg,
          lastAt,
          unread,
        });
      }

      rooms.sort((a, b) => b.lastAt - a.lastAt);
      setGroupRooms(rooms);
    });
  }, [nickname]);

  const formatTime = (ms: number) => {
    if (!ms) return "";
    const now = Date.now();
    const diff = now - ms;
    if (diff < 60000) return "방금";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${Math.floor(diff / 86400000)}일 전`;
  };

  if (!nickname) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <PageContainer>
      <div className="min-h-screen bg-gray-50 -m-4">

        {/* 상단 인사 */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs text-gray-400 font-semibold">안녕하세요,</p>
          <p className="text-xl font-black text-gray-800">{nickname} 님의 채팅방 💬</p>
        </div>

        <div className="px-4 pb-24 space-y-6">

          {/* ── 1:1 채팅 ── */}
          <section>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider px-1 mb-2">1:1 채팅</p>
            {dmRooms.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 px-5 py-6 text-center">
                <p className="text-gray-400 text-sm">참여 중인 1:1 채팅이 없어요</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dmRooms.map((r) => {
                  const id = `dm-${r.friendUid}`;
                  const isOpen = openId === id;
                  return (
                    <div key={id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                      {/* 방 행 */}
                      <button onClick={() => toggle(id)} className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full overflow-hidden">
                            <TextAvatar nickname={r.friendNickname} size={44} profileImage={r.profileImage} />
                          </div>
                          {r.unread > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-400 text-white text-[10px] font-black flex items-center justify-center">
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
                          <span className={`text-gray-300 text-sm transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▾</span>
                        </div>
                      </button>

                      {/* 슬라이드 패널 */}
                      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-24" : "max-h-0"}`}>
                        <div className="px-4 pb-4 flex items-center justify-between border-t border-gray-50">
                          <p className="text-xs text-gray-400 mt-3">{r.friendNickname}님과의 1:1 대화방</p>
                          <button
                            onClick={() => router.push(`/avatar?open=${encodeURIComponent(r.friendNickname)}`)}
                            className="mt-3 px-5 py-2 rounded-xl bg-orange-400 text-white font-black text-sm shadow-sm active:scale-95 transition-transform">
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

          {/* ── 단체 채팅 ── */}
          <section>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider px-1 mb-2">단체 채팅</p>
            {groupRooms.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 px-5 py-6 text-center">
                <p className="text-gray-400 text-sm">참여 중인 단체 채팅이 없어요</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groupRooms.map((r) => {
                  const id = `group-${r.id}`;
                  const isOpen = openId === id;
                  return (
                    <div key={id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                      <button onClick={() => toggle(id)} className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-orange-200 to-amber-200 flex items-center justify-center font-black text-orange-500 text-lg">
                            {r.profileImage
                              ? <img src={r.profileImage} alt={r.name} className="w-full h-full object-cover" />
                              : r.name[0]}
                          </div>
                          {r.unread > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-400 text-white text-[10px] font-black flex items-center justify-center">
                              {r.unread > 9 ? "9+" : r.unread}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <p className="font-black text-gray-800 text-sm">{r.name}</p>
                            <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">{r.members.length}명</span>
                          </div>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{r.lastMsg}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <p className="text-[10px] text-gray-300">{formatTime(r.lastAt)}</p>
                          <span className={`text-gray-300 text-sm transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▾</span>
                        </div>
                      </button>

                      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-24" : "max-h-0"}`}>
                        <div className="px-4 pb-4 flex items-center justify-between border-t border-gray-50">
                          <p className="text-xs text-gray-400 mt-3">멤버 {r.members.length}명 · {r.members.slice(0, 3).join(", ")}{r.members.length > 3 ? " 외" : ""}</p>
                          <button
                            onClick={() => router.push(`/groupchat?room=${r.id}`)}
                            className="mt-3 px-5 py-2 rounded-xl bg-orange-400 text-white font-black text-sm shadow-sm active:scale-95 transition-transform">
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
