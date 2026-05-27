"use client";

import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/app/firebase";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, addDoc, query, where, onSnapshot } from "firebase/firestore";
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
  };

  const isFriend = (uid: string) => friends.some((f) => f.uid === uid);
  const filteredUsers = useMemo(() => users.filter((u) => u.nickname?.toLowerCase().includes(search.toLowerCase())), [users, search]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-[#fff6ee] via-[#fff0e0] to-[#fff8f0]" />
      <div className="fixed top-[-160px] right-[-160px] w-[500px] h-[500px] rounded-full bg-orange-300/20 blur-[100px] animate-[floatA_10s_ease-in-out_infinite_alternate]" />
      <div className="fixed bottom-[-200px] left-[-160px] w-[480px] h-[480px] rounded-full bg-yellow-300/20 blur-[100px] animate-[floatB_13s_ease-in-out_infinite_alternate]" />

      <div className="relative z-10">
        {/* 헤더 */}
        <div className="sticky top-0 z-20 flex items-center h-14 px-4 bg-white/70 backdrop-blur-md border-b border-orange-100">
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
              className="w-full bg-white/80 border border-orange-100 rounded-[18px] pl-11 pr-4 py-3.5 text-sm text-[#3d1f00] placeholder:text-[#d4b090] outline-none focus:ring-2 focus:ring-orange-200 shadow-sm"
              placeholder="사용자 검색" />
          </div>

          {/* 받은 요청 */}
          {requests.length > 0 && (
            <div>
              <p className="font-black text-[#3d1f00] text-base mb-3 px-1">받은 요청 🔔 <span className="text-orange-400">{requests.length}</span></p>
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="rounded-[20px] bg-white/80 backdrop-blur-sm border border-orange-100 px-4 py-3.5 flex items-center justify-between shadow-sm">
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
                        className="px-4 py-2 bg-orange-50 border border-orange-100 text-[#c07030] rounded-[12px] text-xs font-black">거절</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 내 친구 */}
          {friends.length > 0 && (
            <div>
              <p className="font-black text-[#3d1f00] text-base mb-3 px-1">내 친구 👫 <span className="text-orange-400">{friends.length}</span></p>
              <div className="space-y-2">
                {friends.map((f) => (
                  <div key={f.uid} className="rounded-[20px] bg-white/80 backdrop-blur-sm border border-orange-100 px-4 py-3.5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-orange-200 shrink-0">
                          <TextAvatar nickname={f.nickname} size={44} profileImage={f.profileImage ?? null} />
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
                      </div>
                      <p className="font-black text-[#3d1f00] text-sm">{f.nickname}</p>
                    </div>
                    <button onClick={() => removeFriend(f.uid)}
                      className="px-4 py-2 bg-red-50 border border-red-100 text-red-400 rounded-[12px] text-xs font-black">삭제</button>
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
                  <div key={user.uid} className="rounded-[20px] bg-white/80 backdrop-blur-sm border border-orange-100 px-4 py-3.5 flex items-center justify-between shadow-sm">
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

      <style>{`
        @keyframes floatA { 0%{transform:translate(0,0)} 100%{transform:translate(-30px,40px)} }
        @keyframes floatB { 0%{transform:translate(0,0)} 100%{transform:translate(40px,-30px)} }
      `}</style>
    </main>
  );
}
