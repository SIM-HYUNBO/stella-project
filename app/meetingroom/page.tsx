"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/app/firebase";
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove,
} from "firebase/firestore";
import TextAvatar from "@/components/TextAvatar";
import PageContainer from "@/components/PageContainer";

type MeetingRoom = {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  topic: string;
  topicSetBy?: string;
  profileImage?: string;
};

type Msg = {
  id: string;
  from: string;
  content: string;
  type?: "text" | "urgent";
  createdAt?: any;
};

export default function MeetingRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nickname, setNickname] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<MeetingRoom | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showTopicEdit, setShowTopicEdit] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      setNickname(snap.exists() ? snap.data().nickname || "유저" : "유저");
    });
    return () => unsub();
  }, []);

  // 방 목록
  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "meeting_rooms"), where("members", "array-contains", nickname));
    return onSnapshot(q, (snap) => {
      const list: MeetingRoom[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MeetingRoom));
      setRooms(list);
      const roomId = searchParams.get("room");
      if (roomId) {
        const found = list.find((r) => r.id === roomId);
        if (found) setCurrentRoom(found);
      }
    });
  }, [nickname]);

  // 현재 방 실시간 업데이트 (주제 등)
  useEffect(() => {
    if (!currentRoom) return;
    return onSnapshot(doc(db, "meeting_rooms", currentRoom.id), (snap) => {
      if (snap.exists()) setCurrentRoom({ id: snap.id, ...snap.data() } as MeetingRoom);
    });
  }, [currentRoom?.id]);

  // 메시지
  useEffect(() => {
    if (!currentRoom) return;
    const q = query(collection(db, "meeting_rooms", currentRoom.id, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      const list: Msg[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Msg));
      setMessages(list);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
  }, [currentRoom?.id]);

  // 전체 유저
  useEffect(() => {
    if (!nickname) return;
    getDocs(collection(db, "users")).then((snap) => {
      const list: string[] = [];
      snap.forEach((d) => { if (d.data().nickname !== nickname) list.push(d.data().nickname); });
      setAllUsers(list);
    });
  }, [nickname]);

  const createRoom = async () => {
    if (!newRoomName.trim() || !nickname) return;
    const members = [nickname, ...selectedUsers];
    await addDoc(collection(db, "meeting_rooms"), {
      name: newRoomName.trim(), members, createdBy: nickname,
      topic: "", createdAt: serverTimestamp(),
    });
    setNewRoomName(""); setSelectedUsers([]); setShowCreate(false);
  };

  const sendMsg = async () => {
    if (!input.trim() || !currentRoom || !nickname) return;
    await addDoc(collection(db, "meeting_rooms", currentRoom.id, "messages"), {
      from: nickname, content: input.trim(), type: "text", createdAt: serverTimestamp(),
    });
    setInput("");
  };

  const sendUrgent = async () => {
    if (!currentRoom || !nickname) return;
    await addDoc(collection(db, "meeting_rooms", currentRoom.id, "messages"), {
      from: nickname,
      content: `🚨 [긴급회의] ${nickname}님이 긴급회의를 소집했습니다! 즉시 참여해주세요.`,
      type: "urgent", createdAt: serverTimestamp(),
    });
  };

  const saveTopic = async () => {
    if (!currentRoom || !nickname) return;
    await updateDoc(doc(db, "meeting_rooms", currentRoom.id), {
      topic: topicInput.trim(), topicSetBy: nickname,
    });
    await addDoc(collection(db, "meeting_rooms", currentRoom.id, "messages"), {
      from: "시스템",
      content: `📌 ${nickname}님이 주제를 설정했습니다: "${topicInput.trim()}"`,
      type: "text", createdAt: serverTimestamp(),
    });
    setShowTopicEdit(false); setTopicInput("");
  };

  const inviteUser = async (target: string) => {
    if (!currentRoom) return;
    await updateDoc(doc(db, "meeting_rooms", currentRoom.id), { members: arrayUnion(target) });
    setShowInvite(false);
  };

  const leaveRoom = async () => {
    if (!currentRoom || !nickname) return;
    await updateDoc(doc(db, "meeting_rooms", currentRoom.id), { members: arrayRemove(nickname) });
    setCurrentRoom(null);
  };

  const formatTime = (ts: any) => {
    if (!ts) return "";
    const d = ts.toDate?.() || new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  // 방 목록 화면
  if (!currentRoom) return (
    <PageContainer>
      <div className="min-h-screen bg-[#fff7ef] -m-4">
        <div className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-400 font-bold text-lg">←</button>
            <span className="font-black text-gray-800 text-base">📋 회의방</span>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-300 text-white font-black text-sm shadow-sm active:scale-95 transition-transform">
            + 만들기
          </button>
        </div>

        <div className="px-4 pt-4 pb-24 space-y-2.5">
          {rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-5xl">📋</p>
              <p className="text-gray-400 font-semibold text-sm">참여 중인 회의방이 없어요</p>
              <button onClick={() => setShowCreate(true)}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-300 text-white font-black text-sm shadow-md active:scale-95 transition-transform">
                첫 회의방 만들기
              </button>
            </div>
          ) : rooms.map((r) => (
            <button key={r.id} onClick={() => setCurrentRoom(r)}
              className="w-full rounded-2xl bg-white border border-gray-100 px-4 py-3.5 flex items-center gap-3 shadow-sm active:bg-orange-50 transition-colors text-left">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-300 to-amber-300 flex items-center justify-center font-black text-white text-lg shrink-0">
                {r.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-800 text-sm">{r.name}</p>
                {r.topic ? (
                  <p className="text-xs text-orange-400 font-semibold truncate mt-0.5">📌 {r.topic}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">{r.members.length}명 참여 중</p>
                )}
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </button>
          ))}
        </div>

        {/* 방 만들기 모달 */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
            <div className="w-full bg-white rounded-t-[28px] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <p className="font-black text-gray-800 text-lg">새 회의방</p>
              <input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="회의방 이름"
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200" />
              <div>
                <p className="text-xs font-black text-gray-400 mb-2">초대할 멤버</p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {allUsers.map((u) => (
                    <button key={u} onClick={() => setSelectedUsers((p) => p.includes(u) ? p.filter((x) => x !== u) : [...p, u])}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${selectedUsers.includes(u) ? "bg-orange-400 text-white" : "bg-gray-100 text-gray-600"}`}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={createRoom}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-300 text-white font-black text-base shadow-md active:scale-95 transition-transform">
                만들기
              </button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );

  // 채팅 화면
  return (
    <div className="flex flex-col h-screen bg-[#fff7ef]">

      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex items-center h-14 px-4 gap-3">
          <button onClick={() => setCurrentRoom(null)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-400 font-bold text-lg shrink-0">←</button>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-800 text-sm truncate">{currentRoom.name}</p>
            <p className="text-[10px] text-gray-400">{currentRoom.members.length}명</p>
          </div>
          {/* 긴급회의 버튼 */}
          <button onClick={sendUrgent}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500 text-white font-black text-xs shadow-md active:scale-95 transition-transform animate-[pulse_3s_infinite]">
            🚨 긴급
          </button>
          {/* 초대 버튼 */}
          <button onClick={() => setShowInvite(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-400 font-bold text-lg">+</button>
        </div>

        {/* 고정 주제 바 */}
        <button onClick={() => { setTopicInput(currentRoom.topic || ""); setShowTopicEdit(true); }}
          className="w-full flex items-center gap-2 px-4 py-2 bg-orange-50 border-t border-orange-100 active:bg-orange-100 transition-colors">
          <span className="text-sm">📌</span>
          <p className="text-xs font-bold text-orange-500 flex-1 text-left truncate">
            {currentRoom.topic || "주제를 설정해보세요 (탭하여 편집)"}
          </p>
          <span className="text-orange-300 text-xs">✏️</span>
        </button>
      </div>

      {/* 메시지 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {messages.map((m) => {
          const isMine = m.from === nickname;
          if (m.type === "urgent") return (
            <div key={m.id} className="flex justify-center my-2">
              <div className="bg-red-500 text-white text-xs font-black px-4 py-2.5 rounded-2xl shadow-[0_4px_16px_rgba(239,68,68,0.4)] max-w-[85%] text-center animate-[pulse_2s_infinite]">
                {m.content}
              </div>
            </div>
          );
          if (m.from === "시스템") return (
            <div key={m.id} className="flex justify-center">
              <span className="text-[10px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{m.content}</span>
            </div>
          );
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
              {!isMine && (
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                  <TextAvatar nickname={m.from} size={32} profileImage={null} />
                </div>
              )}
              <div className="max-w-[72%]">
                {!isMine && <p className="text-[10px] text-gray-400 mb-1 ml-1">{m.from}</p>}
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMine
                  ? "bg-gradient-to-r from-orange-400 to-amber-300 text-white rounded-br-md"
                  : "bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm"}`}>
                  {m.content}
                </div>
                <p className={`text-[9px] text-gray-300 mt-0.5 ${isMine ? "text-right" : "text-left ml-1"}`}>
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2 mb-12">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMsg()}
          placeholder="메시지 입력..."
          className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200" />
        <button onClick={sendMsg}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-400 to-amber-300 text-white font-black flex items-center justify-center shadow-sm active:scale-95 transition-transform">
          ↑
        </button>
      </div>

      {/* 주제 편집 모달 */}
      {showTopicEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowTopicEdit(false)}>
          <div className="w-full bg-white rounded-t-[28px] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-black text-gray-800 text-lg">📌 회의 주제 설정</p>
            <input value={topicInput} onChange={(e) => setTopicInput(e.target.value)}
              placeholder="오늘 회의 주제를 입력하세요"
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200" />
            <button onClick={saveTopic}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-300 text-white font-black text-base shadow-md active:scale-95 transition-transform">
              저장
            </button>
          </div>
        </div>
      )}

      {/* 초대 모달 */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowInvite(false)}>
          <div className="w-full bg-white rounded-t-[28px] p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="font-black text-gray-800 text-lg">멤버 초대</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allUsers.filter((u) => !currentRoom.members.includes(u)).map((u) => (
                <button key={u} onClick={() => inviteUser(u)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 active:bg-orange-50 transition-colors">
                  <div className="w-9 h-9 rounded-full overflow-hidden"><TextAvatar nickname={u} size={36} profileImage={null} /></div>
                  <p className="font-bold text-gray-800 text-sm flex-1 text-left">{u}</p>
                  <span className="text-orange-400 font-black text-sm">초대</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
