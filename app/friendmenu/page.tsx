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
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function FriendsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  /* =========================
      AUTH
  ========================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      setCurrentUser(user);

      await loadUsers(user.uid);
      await loadFriends(user.uid);
    });

    return () => unsub();
  }, []);

  /* =========================
      FRIEND REQUEST LISTENER
  ========================= */
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "friend_requests"),
      where("to", "==", currentUser.uid),
      where("status", "==", "pending")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];

      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });

      setRequests(list);
    });

    return () => unsub();
  }, [currentUser]);

  /* =========================
      LOAD USERS
  ========================= */
  const loadUsers = async (uid: string) => {
    const snap = await getDocs(collection(db, "users"));

    const list: any[] = [];

    snap.forEach((d) => {
      if (d.id !== uid) {
        list.push({
          uid: d.id,
          ...d.data(),
        });
      }
    });

    setUsers(list);
  };

  /* =========================
      LOAD FRIENDS (양방향)
  ========================= */
  const loadFriends = async (uid: string) => {
    const q = query(
      collection(db, "friends"),
      where("users", "array-contains", uid)
    );

    const snap = await getDocs(q);

    const list: any[] = [];

    for (const d of snap.docs) {
      const data = d.data();

      const friendId = data.users.find((u: string) => u !== uid);

      const userSnap = await getDoc(doc(db, "users", friendId));

      if (userSnap.exists()) {
        list.push({
          uid: friendId,
          ...userSnap.data(),
        });
      }
    }

    setFriends(list);
  };

  /* =========================
      SEND FRIEND REQUEST
  ========================= */
  const sendFriendRequest = async (target: any) => {
    if (!currentUser) return;

    await addDoc(collection(db, "friend_requests"), {
      from: currentUser.uid,
      to: target.uid,
      status: "pending",
      createdAt: Date.now(),
    });

    alert("친구 요청 전송 완료");
  };

  /* =========================
      ACCEPT FRIEND REQUEST (양쪽 친구 생성)
  ========================= */
  const acceptRequest = async (req: any) => {
    if (!currentUser) return;

    const chatId = [currentUser.uid, req.from].sort().join("_");

    // 🔥 양방향 친구 (1개 문서로 처리)
    await setDoc(doc(db, "friends", chatId), {
      users: [currentUser.uid, req.from],
      createdAt: Date.now(),
    });

    // 요청 삭제
    await deleteDoc(doc(db, "friend_requests", req.id));

    await loadFriends(currentUser.uid);

    alert("친구 추가 완료 (양방향)");
  };

  /* =========================
      REMOVE FRIEND
  ========================= */
  const removeFriend = async (friendUid: string) => {
    if (!currentUser) return;

    const q = query(
      collection(db, "friends"),
      where("users", "array-contains", currentUser.uid)
    );

    const snap = await getDocs(q);

    snap.forEach(async (d) => {
      const data = d.data();

      if (data.users.includes(friendUid)) {
        await deleteDoc(doc(db, "friends", d.id));
      }
    });

    setFriends((prev) => prev.filter((f) => f.uid !== friendUid));
  };

  /* =========================
      FILTER
  ========================= */
  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      u.nickname?.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  /* =========================
      UI
  ========================= */
  return (
    <div className="min-h-screen bg-gray-100">

      {/* HEADER */}
      <div className="bg-white px-6 py-5 shadow-sm">
        <h1 className="text-2xl font-bold">친구</h1>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mt-3 px-4 py-3 bg-gray-100 rounded-2xl"
          placeholder="검색"
        />
      </div>

      {/* REQUESTS */}
      {requests.length > 0 && (
        <div className="p-5">
          <h2 className="font-bold mb-3">친구 요청</h2>

          {requests.map((r) => (
            <div
              key={r.id}
              className="bg-white p-4 rounded-xl flex justify-between mb-2"
            >
              <span>{r.from}</span>

              <button
                onClick={() => acceptRequest(r)}
                className="bg-green-500 text-white px-3 py-1 rounded"
              >
                수락
              </button>
            </div>
          ))}
        </div>
      )}

      {/* USERS */}
      <div className="p-5">
        <h2 className="font-bold mb-3">전체 사용자</h2>

        {filteredUsers.map((user) => (
          <div
            key={user.uid}
            className="bg-white p-4 rounded-xl flex justify-between mb-2"
          >
            <span>{user.nickname}</span>

            <button
              onClick={() => sendFriendRequest(user)}
              className="bg-blue-500 text-white px-3 py-1 rounded"
            >
              요청
            </button>
          </div>
        ))}
      </div>

      {/* FRIENDS */}
      <div className="p-5">
        <h2 className="font-bold mb-3">내 친구</h2>

        {friends.length === 0 && (
          <div className="text-gray-400">친구 없음</div>
        )}

        {friends.map((f) => (
          <div
            key={f.uid}
            className="bg-white p-4 rounded-xl flex justify-between mb-2"
          >
            <span>{f.nickname}</span>

            <button
              onClick={() => removeFriend(f.uid)}
              className="bg-red-500 text-white px-3 py-1 rounded"
            >
              삭제
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}