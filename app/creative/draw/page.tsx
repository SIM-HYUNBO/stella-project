"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc, getDocs, collection, query, where, addDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

type Friend = { uid: string; nickname: string };
type DrawRequest = { id: string; from: string; to: string; status: string; sessionId: string };

export default function DrawLobbyPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<DrawRequest[]>([]);
  const [outgoing, setOutgoing] = useState<DrawRequest | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setNickname(snap.data().nickname || "유저");
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
        if (uSnap.exists()) list.push({ uid: otherUid, nickname: uSnap.data().nickname });
      }
      setFriends(list);
    })();
  }, [uid]);

  // 받은 요청 구독
  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "draw_requests"), where("to", "==", nickname), where("status", "==", "pending"));
    return onSnapshot(q, (snap) => {
      setIncoming(snap.docs.map(d => ({ id: d.id, ...d.data() } as DrawRequest)));
    });
  }, [nickname]);

  // 보낸 요청 구독 (수락 감지 포함)
  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "draw_requests"), where("from", "==", nickname), where("status", "in", ["pending", "accepted"]));
    return onSnapshot(q, (snap) => {
      const pending = snap.docs.find(d => d.data().status === "pending");
      const accepted = snap.docs.find(d => d.data().status === "accepted");
      if (accepted) {
        router.push(`/creative/draw/${accepted.data().sessionId}`);
        return;
      }
      setOutgoing(pending ? { id: pending.id, ...pending.data() } as DrawRequest : null);
    });
  }, [nickname]);

  const sendRequest = async (friend: Friend) => {
    if (!nickname || outgoing || requesting) return;
    setRequesting(friend.nickname);
    const sessionId = `draw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await addDoc(collection(db, "draw_requests"), {
      from: nickname,
      to: friend.nickname,
      status: "pending",
      sessionId,
      createdAt: serverTimestamp(),
    });
    setRequesting(null);
  };

  const acceptRequest = async (req: DrawRequest) => {
    await updateDoc(doc(db, "draw_requests", req.id), { status: "accepted" });
    router.push(`/creative/draw/${req.sessionId}`);
  };

  const rejectRequest = async (req: DrawRequest) => {
    await updateDoc(doc(db, "draw_requests", req.id), { status: "rejected" });
  };

  const cancelRequest = async () => {
    if (!outgoing) return;
    await updateDoc(doc(db, "draw_requests", outgoing.id), { status: "rejected" });
  };

  return (
    <div className="min-h-screen pb-10" style={{ background: "linear-gradient(160deg, #fdf4ff 0%, #fef9ec 50%, #f0f9ff 100%)" }}>

      {/* 헤더 */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-6">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white/80 border border-purple-100 flex items-center justify-center text-slate-600 text-xl font-bold active:scale-90 transition-transform">
          ‹
        </button>
        <div>
          <h1 className="font-black text-slate-800 text-xl">단체 협업 그림</h1>
          <p className="text-slate-400 text-xs">함께 그릴 친구를 골라요</p>
        </div>
      </div>

      <div className="px-5 space-y-5">

        {/* 내가 보낸 요청 대기 중 */}
        {outgoing && (
          <div className="rounded-[20px] bg-yellow-50 border border-yellow-200 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-black text-slate-700 text-sm">⏳ {outgoing.to}에게 요청 중...</p>
              <p className="text-slate-400 text-xs mt-0.5">수락을 기다리고 있어요</p>
            </div>
            <button onClick={cancelRequest}
              className="text-xs text-red-400 font-bold px-3 py-1.5 rounded-full bg-red-50 active:scale-95 transition">
              취소
            </button>
          </div>
        )}

        {/* 받은 요청 */}
        {incoming.length > 0 && (
          <div className="space-y-2">
            <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">받은 요청</p>
            {incoming.map((req) => (
              <div key={req.id} className="rounded-[20px] bg-white/80 border border-purple-200 px-5 py-4 flex items-center gap-4 shadow-sm">
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-lg text-purple-600 shrink-0" style={{ background: "linear-gradient(135deg, #f3e8ff, #fce7f3)" }}>
                  {req.from[0]}
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-800 text-sm">{req.from}</p>
                  <p className="text-slate-400 text-xs">같이 그림 그리자고 해요!</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => rejectRequest(req)}
                    className="text-xs text-red-400 font-bold px-3 py-1.5 rounded-full bg-red-50 active:scale-95 transition">
                    거절
                  </button>
                  <button onClick={() => acceptRequest(req)}
                    className="text-xs text-white font-bold px-3 py-1.5 rounded-full active:scale-95 transition"
                    style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>
                    수락
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 친구 목록 */}
        <div className="space-y-2">
          <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">친구 선택</p>
          {friends.length === 0 ? (
            <div className="rounded-[20px] bg-white/60 border border-slate-100 px-5 py-8 text-center">
              <p className="text-slate-400 text-sm">친구가 없어요 🥲</p>
            </div>
          ) : (
            friends.map((friend) => (
              <button key={friend.uid} onClick={() => sendRequest(friend)}
                disabled={!!outgoing || requesting === friend.nickname}
                className="w-full rounded-[20px] bg-white/80 backdrop-blur-sm border border-purple-100 px-5 py-4 flex items-center gap-4 active:scale-[0.98] transition-transform shadow-sm disabled:opacity-50">
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-lg text-purple-600 shrink-0" style={{ background: "linear-gradient(135deg, #f3e8ff, #fce7f3)" }}>
                  {friend.nickname[0]}
                </div>
                <div className="text-left flex-1">
                  <p className="font-black text-slate-800 text-sm">{friend.nickname}</p>
                  <p className="text-purple-400 text-xs">함께 그리기 요청 보내기</p>
                </div>
                <span className="text-purple-300 text-xl">›</span>
              </button>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
