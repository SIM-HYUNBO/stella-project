"use client";

import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/app/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  onSnapshot,
  getDocs as _getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function FriendsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentNickname, setCurrentNickname] = useState<string>("");
  const [users, setUsers] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  /* AUTH */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setCurrentUser(user);
      const nick = user.displayName || "유저";
      setCurrentNickname(nick);
      await loadUsers(user.uid);
      await loadFriends(user.uid);
    });
    return () => unsub();
  }, []);

  /* 보낸 요청 추적 */
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "friend_requests"),
      where("from", "==", currentUser.uid),
      where("status", "==", "pending")
    );
    return onSnapshot(q, (snap) => {
      const ids = new Set<string>();
      snap.forEach((d) => ids.add(d.data().to));
      setSentRequests(ids);
    });
  }, [currentUser]);

  /* 받은 요청 */
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "friend_requests"),
      where("to", "==", currentUser.uid),
      where("status", "==", "pending")
    );
    return onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setRequests(list);
    });
  }, [currentUser]);

  const loadUsers = async (uid: string) => {
    const snap = await getDocs(collection(db, "users"));
    const list: any[] = [];
    snap.forEach((d) => {
      if (d.id !== uid) list.push({ uid: d.id, ...d.data() });
    });
    setUsers(list);
  };

  const loadFriends = async (uid: string) => {
    const q = query(collection(db, "friends"), where("users", "array-contains", uid));
    const snap = await getDocs(q);
    const list: any[] = [];
    for (const d of snap.docs) {
      const data = d.data();
      const friendId = data.users.find((u: string) => u !== uid);
      const userSnap = await getDoc(doc(db, "users", friendId));
      if (userSnap.exists()) list.push({ uid: friendId, ...userSnap.data() });
    }
    setFriends(list);
  };

  const sendFriendRequest = async (target: any) => {
    if (!currentUser) return;

    // 이미 친구인지 확인
    if (friends.some((f) => f.uid === target.uid)) {
      alert("이미 친구입니다.");
      return;
    }

    // 이미 요청 보냈는지 확인
    if (sentRequests.has(target.uid)) {
      alert("이미 요청을 보냈습니다.");
      return;
    }

    await addDoc(collection(db, "friend_requests"), {
      from: currentUser.uid,
      fromNickname: currentNickname,
      to: target.uid,
      toNickname: target.nickname,
      status: "pending",
      createdAt: Date.now(),
    });

    alert(`${target.nickname}님에게 친구 요청을 보냈습니다.`);
  };

  const acceptRequest = async (req: any) => {
    if (!currentUser) return;
    const chatId = [currentUser.uid, req.from].sort().join("_");
    await setDoc(doc(db, "friends", chatId), {
      users: [currentUser.uid, req.from],
      createdAt: Date.now(),
    });
    await deleteDoc(doc(db, "friend_requests", req.id));
    await loadFriends(currentUser.uid);
    alert(`${req.fromNickname}님과 친구가 되었습니다.`);
  };

  const rejectRequest = async (req: any) => {
    await deleteDoc(doc(db, "friend_requests", req.id));
  };

  const removeFriend = async (friendUid: string) => {
    if (!currentUser) return;
    const q = query(collection(db, "friends"), where("users", "array-contains", currentUser.uid));
    const snap = await getDocs(q);
    snap.forEach(async (d) => {
      if (d.data().users.includes(friendUid)) {
        await deleteDoc(doc(db, "friends", d.id));
      }
    });
    setFriends((prev) => prev.filter((f) => f.uid !== friendUid));
  };

  const isFriend = (uid: string) => friends.some((f) => f.uid === uid);

  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      u.nickname?.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  return (
    <div className="min-h-screen bg-gray-100">

      {/* HEADER */}
      <div className="bg-white px-6 py-5 shadow-sm flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <h1 className="text-2xl font-bold">친구</h1>
      </div>

      <div className="px-5 pt-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 bg-white rounded-2xl shadow-sm"
          placeholder="사용자 검색"
        />
      </div>

      {/* 받은 요청 */}
      {requests.length > 0 && (
        <div className="p-5">
          <h2 className="font-bold mb-3 text-gray-700">친구 요청 ({requests.length})</h2>
          {requests.map((r) => (
            <div key={r.id} className="bg-white p-4 rounded-xl flex justify-between items-center mb-2 shadow-sm">
              <span className="font-medium">{r.fromNickname || r.from}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => acceptRequest(r)}
                  className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm"
                >
                  수락
                </button>
                <button
                  onClick={() => rejectRequest(r)}
                  className="bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm"
                >
                  거절
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 내 친구 */}
      {friends.length > 0 && (
        <div className="p-5">
          <h2 className="font-bold mb-3 text-gray-700">내 친구 ({friends.length})</h2>
          {friends.map((f) => (
            <div key={f.uid} className="bg-white p-4 rounded-xl flex justify-between items-center mb-2 shadow-sm">
              <span className="font-medium">{f.nickname}</span>
              <button
                onClick={() => removeFriend(f.uid)}
                className="bg-red-100 text-red-500 px-3 py-1.5 rounded-lg text-sm"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 전체 사용자 */}
      <div className="p-5">
        <h2 className="font-bold mb-3 text-gray-700">전체 사용자</h2>
        {filteredUsers.map((user) => {
          const alreadyFriend = isFriend(user.uid);
          const alreadySent = sentRequests.has(user.uid);
          return (
            <div key={user.uid} className="bg-white p-4 rounded-xl flex justify-between items-center mb-2 shadow-sm">
              <span className="font-medium">{user.nickname}</span>
              {alreadyFriend ? (
                <span className="text-xs text-green-500 font-medium">친구</span>
              ) : alreadySent ? (
                <span className="text-xs text-gray-400">요청됨</span>
              ) : (
                <button
                  onClick={() => sendFriendRequest(user)}
                  className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm"
                >
                  요청
                </button>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
