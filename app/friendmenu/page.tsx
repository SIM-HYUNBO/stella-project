"use client";

import { useEffect, useMemo, useState } from "react";
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
    setUsers(list);
  };

  const loadFriends = async (uid: string) => {
    const q = query(collection(db, "friends"), where("users", "array-contains", uid));
    const snap = await getDocs(q);
    const list: any[] = [];
    for (const d of snap.docs) {
      const friendId = d.data().users.find((u: string) => u !== uid);
      const userSnap = await getDoc(doc(db, "users", friendId));
      if (userSnap.exists()) list.push({ uid: friendId, ...userSnap.data() });
    }
    setFriends(list);
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

  const isFriend = (uid: string) => friends.some((f) => f.uid === uid);
  const filteredUsers = useMemo(() => users.filter((u) => u.nickname?.toLowerCase().includes(search.toLowerCase())), [users, search]);
  // 숨긴 친구는 목록에서 제외
  const visibleFriends = friends.filter((f) => !hiddenDocs[f.uid]);

  return (
    <main className="relative min-h-screen overflow-hidden" onClick={() => setMenuOpen(null)}>
      <div className="fixed inset-0 bg-gray-50" />

      <div className="relative z-10">
        <div className="sticky top-0 z-20 flex items-center h-14 px-4 bg-white border-b border-gray-100">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-400 font-bold text-lg mr-3">←</button>
          <span className="font-black text-[#3d1f00] text-base">친구 🤝</span>
          {requests.length > 0 && (
            <span className="ml-2 w-5 h-5 rounded-full bg-gradient-to-r from-orange-400 to-amber-300 text-white text-[10px] font-black flex items-center justify-center shadow">{requests.length}</span>
          )}
        </div>

        <div className="px-5 pt-4 pb-20 space-y-5">

          {/* 검색 */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4a07a] text-lg">🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-[18px] pl-11 pr-4 py-3.5 text-sm text-[#3d1f00] placeholder:text-[#d4b090] outline-none focus:ring-2 focus:ring-orange-200 shadow-sm"
              placeholder="사용자 검색" />
          </div>

          {/* 받은 요청 */}
          {requests.length > 0 && (
            <div>
              <p className="font-black text-[#3d1f00] text-base mb-3 px-1">받은 요청 🔔 <span className="text-orange-400">{requests.length}</span></p>
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="rounded-[20px] bg-white border border-gray-100 px-4 py-3.5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-orange-200 shrink-0">
                        <TextAvatar nickname={r.fromNickname || r.from} size={44} profileImage={null} />
                      </div>
                      <div>
                        <p className="font-black text-[#3d1f00] text-sm">{r.fromNickname || r.from}</p>
                        <p className="text-[#c09070] text-xs">친구 요청을 보냈어요</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptRequest(r)}
                        className="px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-300 text-white rounded-[12px] text-xs font-black shadow-md">수락</button>
                      <button onClick={() => rejectRequest(r)}
                        className="px-4 py-2 bg-gray-50 border border-gray-100 text-[#c07030] rounded-[12px] text-xs font-black">거절</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 즐겨찾는 친구 */}
          {friends.filter((f) => favoriteDocs[f.uid]).length > 0 && (
            <div>
              <p className="font-black text-[#3d1f00] text-base mb-3 px-1">
                <svg className="inline-block w-4 h-4 mr-1 mb-0.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                즐겨찾는 친구 <span className="text-amber-400">{friends.filter((f) => favoriteDocs[f.uid]).length}</span>
              </p>
              <div className="space-y-2">
                {friends.filter((f) => favoriteDocs[f.uid]).map((f) => (
                  <div key={f.uid} className="rounded-[20px] bg-amber-50 border border-amber-100 px-4 py-3.5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-amber-300 shrink-0">
                          <TextAvatar nickname={f.nickname} size={44} profileImage={f.profileImage ?? null} />
                        </div>
                        <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </span>
                      </div>
                      <div>
                        <p className="font-black text-[#3d1f00] text-sm">{f.nickname}</p>
                        {mutedDocs[f.uid] && <span className="text-[10px] text-[#c09070] bg-orange-50 rounded-full px-2 py-0.5">🔕 알림 꺼짐</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(f); }}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-100 text-amber-400"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 내 친구 */}
          {visibleFriends.length > 0 && (
            <div>
              <p className="font-black text-[#3d1f00] text-base mb-3 px-1">내 친구 👫 <span className="text-orange-400">{visibleFriends.length}</span></p>
              <div className="space-y-2">
                {visibleFriends.map((f) => (
                  <div key={f.uid} className="relative rounded-[20px] bg-white border border-gray-100 px-4 py-3.5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-orange-200 shrink-0">
                          <TextAvatar nickname={f.nickname} size={44} profileImage={f.profileImage ?? null} />
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
                      </div>
                      <div>
                        <p className="font-black text-[#3d1f00] text-sm">{f.nickname}</p>
                        <div className="flex gap-1 mt-0.5">
                          {mutedDocs[f.uid] && <span className="text-[10px] text-[#c09070] bg-orange-50 rounded-full px-2 py-0.5">🔕 알림 꺼짐</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === f.uid ? null : f.uid); }}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-orange-50 text-[#c09070] font-black text-lg"
                    >···</button>

                    {/* 액션 메뉴 */}
                    {menuOpen === f.uid && (
                      <div onClick={(e) => e.stopPropagation()}
                        className="absolute right-4 top-14 z-30 w-44 bg-white rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-orange-100 overflow-hidden">
                        <button onClick={() => toggleFavorite(f)}
                          className="w-full px-4 py-3 text-left text-sm font-semibold text-[#3d1f00] hover:bg-amber-50 flex items-center gap-2">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill={favoriteDocs[f.uid] ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          {favoriteDocs[f.uid] ? "즐겨찾기 해제" : "즐겨찾기"}
                        </button>
                        <div className="h-px bg-orange-50" />
                        <button onClick={() => toggleMute(f)}
                          className="w-full px-4 py-3 text-left text-sm font-semibold text-[#3d1f00] hover:bg-orange-50 flex items-center gap-2">
                          {mutedDocs[f.uid] ? "🔔 알림 켜기" : "🔕 알림 끄기"}
                        </button>
                        <div className="h-px bg-orange-50" />
                        <button onClick={() => toggleHide(f)}
                          className="w-full px-4 py-3 text-left text-sm font-semibold text-[#3d1f00] hover:bg-orange-50 flex items-center gap-2">
                          🙈 숨기기
                        </button>
                        <div className="h-px bg-orange-50" />
                        <button onClick={() => removeFriend(f.uid)}
                          className="w-full px-4 py-3 text-left text-sm font-semibold text-red-400 hover:bg-red-50 flex items-center gap-2">
                          🗑 친구 삭제
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 전체 사용자 */}
          <div>
            <p className="font-black text-[#3d1f00] text-base mb-3 px-1">전체 사용자 🌍</p>
            <div className="space-y-2">
              {filteredUsers.map((user) => {
                const alreadyFriend = isFriend(user.uid);
                const alreadySent = sentRequests.has(user.uid);
                return (
                  <div key={user.uid} className="rounded-[20px] bg-white border border-gray-100 px-4 py-3.5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-orange-100 shrink-0">
                        <TextAvatar nickname={user.nickname} size={44} profileImage={user.profileImage ?? null} />
                      </div>
                      <p className="font-black text-[#3d1f00] text-sm">{user.nickname}</p>
                    </div>
                    {alreadyFriend ? (
                      <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-500 text-xs font-black">친구 ✓</span>
                    ) : alreadySent ? (
                      <span className="px-3 py-1.5 rounded-full bg-orange-50 text-[#c09070] text-xs font-black">요청됨</span>
                    ) : (
                      <button onClick={() => sendFriendRequest(user)}
                        className="px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-300 text-white rounded-[12px] text-xs font-black shadow-md">요청</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
