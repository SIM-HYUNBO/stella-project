"use client";

import { useEffect, useMemo, useState } from "react";
import PageContainer from "@/components/PageContainer";
import LoadingScreen from "@/components/LoadingScreen";
import { auth, db } from "@/app/firebase";
import {
  collection, doc, getDocs, getDoc, setDoc, deleteDoc, addDoc,
  query, where, onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import TextAvatar from "@/components/TextAvatar";

export default function FriendsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentNickname, setCurrentNickname] = useState<string>("");
  const [users, setUsers] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  // 숨기기 / 알림끄기 / 즐겨찾기
  const [hiddenDocs, setHiddenDocs] = useState<Record<string, string>>({});
  const [mutedDocs, setMutedDocs] = useState<Record<string, string>>({});
  const [favoriteDocs, setFavoriteDocs] = useState<Record<string, string>>({});
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // 프로필 카드
  const [profileView, setProfileView] = useState<any | null>(null);
  const [phonePopup, setPhonePopup] = useState<string | null>(null);
  const [actionSheet, setActionSheet] = useState<any | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setCurrentUser(user);
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const nick = userSnap.exists() ? userSnap.data().nickname : (user.displayName || "유저");
      setCurrentNickname(nick);
      await loadUsers(user.uid);
      await loadFriends(user.uid);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "friend_requests"), where("from", "==", currentUser.uid), where("status", "==", "pending"));
    return onSnapshot(q, (snap) => {
      const ids = new Set<string>();
      snap.forEach((d) => ids.add(d.data().to));
      setSentRequests(ids);
    });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "friend_requests"), where("to", "==", currentUser.uid), where("status", "==", "pending"));
    return onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setRequests(list);
    });
  }, [currentUser]);

  // 숨긴 친구 구독
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "hidden"), where("user_id", "==", currentUser.uid));
    return onSnapshot(q, (snap) => {
      const docs: Record<string, string> = {};
      snap.forEach((d) => {
        const uid = d.data().target_uid;
        if (uid) docs[uid] = d.id;
      });
      setHiddenDocs(docs);
    });
  }, [currentUser]);

  // 즐겨찾기 구독
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "favorites"), where("user_id", "==", currentUser.uid));
    return onSnapshot(q, (snap) => {
      const docs: Record<string, string> = {};
      snap.forEach((d) => {
        const uid = d.data().target_uid;
        if (uid) docs[uid] = d.id;
      });
      setFavoriteDocs(docs);
    });
  }, [currentUser]);

  // 알림 끈 친구 구독
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "muted"), where("user_id", "==", currentUser.uid));
    return onSnapshot(q, (snap) => {
      const docs: Record<string, string> = {};
      snap.forEach((d) => {
        const uid = d.data().target_uid;
        if (uid) docs[uid] = d.id;
      });
      setMutedDocs(docs);
    });
  }, [currentUser]);

  const loadUsers = async (uid: string) => {
    const snap = await getDocs(collection(db, "users"));
    const list: any[] = [];
    snap.forEach((d) => { if (d.id !== uid) list.push({ uid: d.id, ...d.data() }); });
    list.sort((a, b) => (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko"));
    setUsers(list);
  };

  const loadFriends = async (uid: string) => {
    const q = query(collection(db, "friends"), where("users", "array-contains", uid));
    const snap = await getDocs(q);
    const list: any[] = [];
    for (const d of snap.docs) {
      const friendId = d.data().users.find((u: string) => u !== uid);
      const userSnap = await getDoc(doc(db, "users", friendId));
      if (userSnap.exists()) list.push({ uid: friendId, friendSince: d.data().createdAt ?? null, ...userSnap.data() });
    }
    list.sort((a, b) => (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko"));
    setFriends(list);
  };

  const getFriendDays = (friendSince: number | null) => {
    if (!friendSince) return null;
    return Math.floor((Date.now() - friendSince) / (1000 * 60 * 60 * 24));
  };

  const getIntimacy = (days: number | null) => {
    if (days === null) return 1;
    if (days >= 180) return 5;
    if (days >= 90) return 4;
    if (days >= 30) return 3;
    if (days >= 7) return 2;
    return 1;
  };

  const sendFriendRequest = async (target: any) => {
    if (!currentUser) return;
    if (friends.some((f) => f.uid === target.uid)) { alert("이미 친구입니다."); return; }
    if (sentRequests.has(target.uid)) { alert("이미 요청을 보냈습니다."); return; }
    await addDoc(collection(db, "friend_requests"), {
      from: currentUser.uid, fromNickname: currentNickname,
      to: target.uid, toNickname: target.nickname,
      status: "pending", createdAt: Date.now(),
    });
    fetch("/api/fcm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toNicknames: target.nickname, fromNickname: currentNickname, message: "친구 요청이 도착했어요! 👋" }),
    }).catch(() => {});
    alert(`${target.nickname}님에게 친구 요청을 보냈습니다.`);
  };

  const acceptRequest = async (req: any) => {
    if (!currentUser) return;
    const chatId = [currentUser.uid, req.from].sort().join("_");
    await setDoc(doc(db, "friends", chatId), { users: [currentUser.uid, req.from], createdAt: Date.now() });
    await deleteDoc(doc(db, "friend_requests", req.id));
    await loadFriends(currentUser.uid);
    alert(`${req.fromNickname}님과 친구가 되었습니다.`);
  };

  const rejectRequest = async (req: any) => { await deleteDoc(doc(db, "friend_requests", req.id)); };

  const removeFriend = async (friendUid: string) => {
    if (!currentUser) return;
    const q = query(collection(db, "friends"), where("users", "array-contains", currentUser.uid));
    const snap = await getDocs(q);
    snap.forEach(async (d) => { if (d.data().users.includes(friendUid)) await deleteDoc(doc(db, "friends", d.id)); });
    setFriends((prev) => prev.filter((f) => f.uid !== friendUid));
    setMenuOpen(null);
  };

  const toggleHide = async (friend: any) => {
    if (!currentUser) return;
    if (hiddenDocs[friend.uid]) {
      await deleteDoc(doc(db, "hidden", hiddenDocs[friend.uid]));
    } else {
      await addDoc(collection(db, "hidden"), {
        user_id: currentUser.uid,
        target_uid: friend.uid,
        target_name: friend.nickname,
      });
    }
    setMenuOpen(null);
  };

  const toggleMute = async (friend: any) => {
    if (!currentUser) return;
    if (mutedDocs[friend.uid]) {
      await deleteDoc(doc(db, "muted", mutedDocs[friend.uid]));
    } else {
      await addDoc(collection(db, "muted"), {
        user_id: currentUser.uid,
        target_uid: friend.uid,
        target_name: friend.nickname,
      });
    }
    setMenuOpen(null);
  };

  const toggleFavorite = async (friend: any) => {
    if (!currentUser) return;
    if (favoriteDocs[friend.uid]) {
      await deleteDoc(doc(db, "favorites", favoriteDocs[friend.uid]));
    } else {
      await addDoc(collection(db, "favorites"), {
        user_id: currentUser.uid,
        target_uid: friend.uid,
        target_name: friend.nickname,
      });
    }
    setMenuOpen(null);
  };

  const openProfile = async (friend: any) => {
    const snap = await getDoc(doc(db, "users", friend.uid));
    const data = snap.exists() ? snap.data() : {};
    setProfileView({
      uid: friend.uid,
      nickname: data.nickname || friend.nickname,
      profileImage: data.profileImage || friend.profileImage || null,
      coverImage: data.coverImage || null,
      statusMessage: data.statusMessage || "",
      phone: data.phone || "",
    });
  };

  const formatPhone = (p: string) => {
    const d = p.replace(/\D/g, "");
    if (d.length === 11) return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
    if (d.length === 10) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
    return p;
  };

  const getDaysUntilBirthday = (birthday: string): number | null => {
    const parts = birthday.replace(/\./g, "-").split("-");
    if (parts.length < 2) return null;
    const month = parseInt(parts[parts.length - 2]);
    const day   = parseInt(parts[parts.length - 1]);
    if (!month || !day) return null;
    const now = new Date();
    const next = new Date(now.getFullYear(), month - 1, day);
    if (next < now) next.setFullYear(now.getFullYear() + 1);
    return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const upcomingBirthdays = friends.filter((f) => {
    if (!f.birthdate) return false;
    const days = getDaysUntilBirthday(f.birthdate);
    return days !== null && days <= 7;
  }).sort((a, b) => (getDaysUntilBirthday(a.birthdate) ?? 99) - (getDaysUntilBirthday(b.birthdate) ?? 99));

  const isFriend = (uid: string) => friends.some((f) => f.uid === uid);
  const filteredUsers = useMemo(() => users.filter((u) => u.nickname?.toLowerCase().includes(search.toLowerCase())), [users, search]);
  // 숨긴 친구는 목록에서 제외
  const visibleFriends = friends.filter((f) => !hiddenDocs[f.uid]);

  if (!currentUser) return <PageContainer><LoadingScreen /></PageContainer>;

  return (
    <PageContainer>
    <main className="relative min-h-screen overflow-hidden" onClick={() => setMenuOpen(null)}>
      <div className="fixed inset-0 bg-gray-50" />

      <div className="relative z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black bg-yellow-200">FRIENDS</span>
            {requests.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-sky-200 text-white text-[10px] font-black flex items-center justify-center shadow">{requests.length}</span>
            )}
            <button
              onClick={() => router.push("/friendmenu")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-50 hover:bg-sky-200 transition active:scale-90"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="text-xs font-bold text-sky-600">친구</span>
            </button>
            <button
              onClick={() => router.push("/diary")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 transition active:scale-90"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span className="text-xs font-bold text-orange-500">일기</span>
            </button>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">친구 목록</div>
        </div>

        <div className="px-5 pt-4 pb-20 space-y-5">

          {/* 검색 */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white rounded-[18px] pl-11 pr-4 py-3.5 text-sm text-slate-800 placeholder:text-[#d4b090] outline-none focus:ring-2 focus:ring-orange-200"
              placeholder="사용자 검색" />
          </div>

          {/* 사용자 검색 결과 — 검색어 있을 때만 표시 */}
          {search.trim() !== "" && (
            <div>
              <p className="font-black text-slate-800 text-base mb-3 px-1">
                검색 결과 <span className="text-sky-600">{filteredUsers.length}</span>
              </p>
              {filteredUsers.length === 0 ? (
                <div className="rounded-[20px] bg-white px-4 py-6 text-center text-slate-400 text-sm">
                  일치하는 사용자가 없어요
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((u) => (
                    <div key={u.uid} className="rounded-[20px] bg-white px-4 py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-sky-100 shrink-0">
                          <TextAvatar nickname={u.nickname} fill profileImage={u.profileImage ?? null} />
                        </div>
                        <p className="font-black text-slate-800 text-sm">{u.nickname}</p>
                      </div>
                      {isFriend(u.uid) ? (
                        <span className="px-3 py-1.5 rounded-full bg-sky-50 text-sky-500 text-xs font-black">친구 ✓</span>
                      ) : sentRequests.has(u.uid) ? (
                        <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-400 text-xs font-black">요청됨</span>
                      ) : (
                        <button
                          onClick={() => sendFriendRequest(u)}
                          className="px-3 py-1.5 rounded-full bg-sky-200 text-white text-xs font-black active:scale-95 transition"
                        >
                          친구 추가
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 받은 요청 */}
          {requests.length > 0 && (
            <div>
              <p className="font-black text-slate-800 text-base mb-3 px-1">받은 요청 🔔 <span className="text-sky-600">{requests.length}</span></p>
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="rounded-[20px] bg-white px-4 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-orange-200 shrink-0">
                        <TextAvatar nickname={r.fromNickname || r.from} fill profileImage={null} />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{r.fromNickname || r.from}</p>
                        <p className="text-sky-600 text-xs">친구 요청을 보냈어요</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptRequest(r)}
                        className="px-4 py-2 bg-sky-200 text-white rounded-[12px] text-xs font-black">수락</button>
                      <button onClick={() => rejectRequest(r)}
                        className="px-4 py-2 bg-gray-50 text-sky-800 rounded-[12px] text-xs font-black">거절</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 곧 생일인 친구 */}
          {upcomingBirthdays.length > 0 && (
            <div>
              <p className="font-black text-slate-800 text-base mb-3 px-1">곧 생일인 친구 🎂</p>
              <div className="space-y-2">
                {upcomingBirthdays.map((f) => {
                  const days = getDaysUntilBirthday(f.birthdate)!;
                  return (
                    <div key={f.uid} className="rounded-[20px] bg-yellow-50 border border-yellow-200 px-4 py-3.5 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-yellow-300 shrink-0">
                        <TextAvatar nickname={f.nickname} fill profileImage={f.profileImage ?? null} />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-slate-800 text-sm">{f.nickname}</p>
                        <p className="text-xs text-yellow-600 mt-0.5">
                          {days === 0 ? "🎉 오늘 생일이에요!" : `🎂 ${days}일 후 생일`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 즐겨찾는 친구 */}
          {friends.filter((f) => favoriteDocs[f.uid]).length > 0 && (
            <div>
              <p className="font-black text-slate-800 text-base mb-3 px-1">
                <svg className="inline-block w-4 h-4 mr-1 mb-0.5 text-sky-600" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                즐겨찾는 친구 <span className="text-sky-600">{friends.filter((f) => favoriteDocs[f.uid]).length}</span>
              </p>
              <div className="space-y-2">
                {friends.filter((f) => favoriteDocs[f.uid]).map((f) => {
                  const days = getFriendDays(f.friendSince);
                  const intimacy = getIntimacy(days);
                  return (
                  <div key={f.uid} onClick={() => openProfile(f)} className="rounded-[20px] bg-sky-50 px-4 py-3.5 flex items-center justify-between cursor-pointer active:scale-[0.98] transition">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-amber-400 shrink-0">
                          <TextAvatar nickname={f.nickname} fill profileImage={f.profileImage ?? null} />
                        </div>
                        <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </span>
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{f.nickname}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] tracking-tight">
                            {Array.from({ length: 5 }, (_, i) => i < intimacy ? "💙" : "🤍").join("")}
                          </span>
                          {days !== null && (
                            <span className="text-[10px] text-gray-400">친구된 지 {days}일</span>
                          )}
                        </div>
                        {mutedDocs[f.uid] && <span className="text-[10px] text-sky-600 bg-sky-50 rounded-full px-2 py-0.5">🔕 알림 꺼짐</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(f); }}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-yellow-200 text-sky-600"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 내 친구 */}
          {visibleFriends.length > 0 && (
            <div>
              <p className="font-black text-slate-800 text-base mb-3 px-1">내 친구 👫 <span className="text-sky-600">{visibleFriends.length}</span></p>
              <div className="space-y-2">
                {visibleFriends.map((f) => {
                  const days = getFriendDays(f.friendSince);
                  const intimacy = getIntimacy(days);
                  return (
                  <div key={f.uid} onClick={() => openProfile(f)} className="relative rounded-[20px] bg-white px-4 py-3.5 flex items-center justify-between cursor-pointer active:scale-[0.98] transition">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-orange-200 shrink-0">
                          <TextAvatar nickname={f.nickname} fill profileImage={f.profileImage ?? null} />
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{f.nickname}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] tracking-tight">
                            {Array.from({ length: 5 }, (_, i) => i < intimacy ? "💙" : "🤍").join("")}
                          </span>
                          {days !== null && (
                            <span className="text-[10px] text-gray-400">친구된 지 {days}일</span>
                          )}
                        </div>
                        {mutedDocs[f.uid] && <span className="text-[10px] text-sky-600 bg-sky-50 rounded-full px-2 py-0.5">🔕 알림 꺼짐</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActionSheet(f); }}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sky-50 text-sky-600 font-black text-lg"
                    >···</button>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

         
        </div>
      </div>

      {/* 프로필 카드 모달 */}
      {profileView && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setProfileView(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative z-10 bg-white rounded-t-[32px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 커버 이미지 */}
            <div className="relative h-44">
              {profileView.coverImage ? (
                <img src={profileView.coverImage} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-yellow-200" />
              )}
              {/* 닫기 버튼 */}
              <button
                onClick={() => setProfileView(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              {/* 프로필 이미지 */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full overflow-hidden">
                <TextAvatar nickname={profileView.nickname} fill profileImage={profileView.profileImage} />
              </div>
            </div>

            {/* 정보 영역 */}
            <div className="pt-12 pb-6 px-6 text-center">
              <div className="font-black text-slate-800 text-xl">{profileView.nickname}</div>
              {profileView.statusMessage ? (
                <div className="text-sm text-gray-400 mt-1">{profileView.statusMessage}</div>
              ) : (
                <div className="text-sm text-gray-300 mt-1">상태 메시지 없음</div>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 px-6 pb-8">
              <button
                onClick={() => { setProfileView(null); router.push(`/avatar?open=${profileView.nickname}`); }}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-[16px] bg-sky-200 text-white font-black active:scale-95 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                1:1 채팅
              </button>
              <button
                onClick={() => { if (profileView.phone) setPhonePopup(profileView.phone); }}
                className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-[16px] font-black active:scale-95 transition ${profileView.phone ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.83a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z"/>
                </svg>
                {profileView.phone ? "통화하기" : "번호 없음"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 통화 팝업 */}
      {phonePopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => setPhonePopup(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative z-10 bg-white rounded-[28px] w-72 px-6 py-7 flex flex-col items-center gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.83a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z"/>
              </svg>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">전화번호</div>
              <div className="text-xl font-black text-slate-800">{formatPhone(phonePopup)}</div>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setPhonePopup(null)}
                className="flex-1 h-11 rounded-[14px] bg-gray-100 text-gray-500 font-bold text-sm active:scale-95 transition"
              >
                취소
              </button>
              <a
                href={`tel:${phonePopup}`}
                className="flex-1 h-11 rounded-[14px] bg-green-500 text-white font-black text-sm flex items-center justify-center gap-1.5 active:scale-95 transition"
                onClick={() => setPhonePopup(null)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.83a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z"/>
                </svg>
                통화
              </a>
            </div>
          </div>
        </div>
      )}
      {/* 액션 시트 */}
      {actionSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setActionSheet(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-t-[28px] pb-10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="px-5 py-3 flex items-center gap-3 border-b border-gray-50">
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-orange-200 shrink-0">
                <TextAvatar nickname={actionSheet.nickname} fill profileImage={actionSheet.profileImage ?? null} />
              </div>
              <p className="font-black text-slate-800">{actionSheet.nickname}</p>
            </div>
            <div className="mt-1">
              <button onClick={() => { toggleFavorite(actionSheet); setActionSheet(null); }}
                className="w-full px-5 py-4 text-left text-sm font-semibold text-slate-800 flex items-center gap-3 active:bg-sky-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill={favoriteDocs[actionSheet.uid] ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {favoriteDocs[actionSheet.uid] ? "즐겨찾기 해제" : "즐겨찾기"}
              </button>
              <div className="h-px bg-gray-50 mx-5" />
              <button onClick={() => { toggleMute(actionSheet); setActionSheet(null); }}
                className="w-full px-5 py-4 text-left text-sm font-semibold text-slate-800 flex items-center gap-3 active:bg-sky-50">
                {mutedDocs[actionSheet.uid] ? "🔔 알림 켜기" : "🔕 알림 끄기"}
              </button>
              <div className="h-px bg-gray-50 mx-5" />
              <button onClick={() => { toggleHide(actionSheet); setActionSheet(null); }}
                className="w-full px-5 py-4 text-left text-sm font-semibold text-slate-800 flex items-center gap-3 active:bg-sky-50">
                🙈 숨기기
              </button>
              <div className="h-px bg-gray-50 mx-5" />
              <button onClick={() => { removeFriend(actionSheet.uid); setActionSheet(null); }}
                className="w-full px-5 py-4 text-left text-sm font-semibold text-red-400 flex items-center gap-3 active:bg-red-50">
                🗑 친구 삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
    </PageContainer>
  );
}
