"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { db, auth } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, doc, getDoc, updateDoc, limit,
} from "firebase/firestore";

const TOPICS = ["전체", "게임", "공부", "음악", "영화", "운동", "음식", "여행", "일상", "기타"];

const TOPIC_COLORS: Record<string, string> = {
  게임: "bg-purple-100 text-purple-600",
  공부: "bg-blue-100 text-blue-600",
  음악: "bg-pink-100 text-pink-600",
  영화: "bg-red-100 text-red-600",
  운동: "bg-green-100 text-green-600",
  음식: "bg-orange-100 text-orange-600",
  여행: "bg-teal-100 text-teal-600",
  일상: "bg-gray-100 text-gray-600",
  기타: "bg-slate-100 text-slate-500",
};

type Room = {
  id: string;
  name: string;
  topic: string;
  createdBy: string;
  lastMessage?: string;
  lastAt?: any;
};

type Message = {
  id: string;
  from: string;
  content: string;
  createdAt: any;
};

export default function OpenChatPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("전체");
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomTopic, setNewRoomTopic] = useState("일상");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      setNickname(snap.exists() ? snap.data().nickname : user.displayName || "유저");
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "openRooms"), orderBy("lastAt", "desc"));
    return onSnapshot(q, (snap) => {
      setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Room)));
    });
  }, []);

  useEffect(() => {
    if (!currentRoom) return;
    const q = query(
      collection(db, "openRooms", currentRoom.id, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
    });
  }, [currentRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createRoom = async () => {
    if (!newRoomName.trim() || !nickname) return;
    const ref = await addDoc(collection(db, "openRooms"), {
      name: newRoomName.trim(),
      topic: newRoomTopic,
      createdBy: nickname,
      lastMessage: "",
      lastAt: serverTimestamp(),
    });
    setNewRoomName("");
    setShowCreate(false);
    const snap = await getDoc(ref);
    setCurrentRoom({ id: ref.id, ...snap.data() } as Room);
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentRoom || !nickname) return;
    const text = input.trim();
    setInput("");
    await addDoc(collection(db, "openRooms", currentRoom.id, "messages"), {
      from: nickname,
      content: text,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "openRooms", currentRoom.id), {
      lastMessage: text,
      lastAt: serverTimestamp(),
    });
  };

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return "";
    return ts.toDate().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  };

  const filteredRooms = selectedTopic === "전체"
    ? rooms
    : rooms.filter((r) => r.topic === selectedTopic);

  if (!nickname) return (
    <PageContainer>
      <div className="flex items-center justify-center h-[60vh] text-gray-400">로딩 중...</div>
    </PageContainer>
  );

  // 채팅방 뷰
  if (currentRoom) return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 z-[100]">
      <div className="px-4 py-3 bg-white flex items-center gap-3 border-b border-gray-100 shrink-0">
        <button onClick={() => setCurrentRoom(null)} className="text-gray-500 text-xl px-1">←</button>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TOPIC_COLORS[currentRoom.topic] || "bg-gray-100 text-gray-500"}`}>
            {currentRoom.topic}
          </span>
          <p className="font-bold text-gray-800 text-sm">{currentRoom.name}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-300 text-sm">
            첫 메시지를 보내보세요!
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.from === nickname;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2`}>
              {!isMe && (
                <div className="w-8 h-8 rounded-full bg-sky-200 flex items-center justify-center text-xs font-black text-white shrink-0 mt-1">
                  {msg.from[0]}
                </div>
              )}
              <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && <p className="text-xs text-gray-400 ml-1">{msg.from}</p>}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  isMe ? "bg-sky-400 text-white rounded-tr-sm" : "bg-white text-gray-800 shadow-sm rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>
                <p className="text-[10px] text-gray-300 mx-1">{formatTime(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 bg-white border-t border-gray-100 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="메시지 입력..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-sky-300 transition"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="w-10 h-10 rounded-2xl bg-sky-400 hover:bg-sky-500 disabled:opacity-40 flex items-center justify-center shrink-0 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );

  // 방 목록 뷰
  return (
    <PageContainer>
      <div className="-mx-4 -mt-4">
        {/* 헤더 */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black bg-yellow-200">OPEN CHAT</span>
            <button
              onClick={() => router.push("/groupchat")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-50 hover:bg-sky-200 transition active:scale-90"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="text-xs font-bold text-sky-600">일반</span>
            </button>
            <button
              onClick={() => router.push("/meetingroom")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-50 hover:bg-red-100 transition active:scale-90"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
                <line x1="7" y1="8" x2="17" y2="8" />
                <line x1="7" y1="12" x2="13" y2="12" />
              </svg>
              <span className="text-xs font-bold text-red-500">회의</span>
            </button>
            <button
              onClick={() => router.push("/openchat")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-yellow-100 transition active:scale-90"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span className="text-xs font-bold text-yellow-600">오픈</span>
            </button>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">오픈채팅</div>
        </div>

        {/* 새 방 버튼 */}
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-2.5 rounded-2xl bg-sky-400 hover:bg-sky-500 text-white text-sm font-black transition active:scale-95 flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            새 오픈채팅 만들기
          </button>
        </div>

      {/* 방 만들기 모달 */}
      {showCreate && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-24 flex flex-col gap-4">
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-1" />
            <p className="font-black text-gray-800 text-base">새 오픈채팅 만들기</p>

            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">주제 선택</p>
              <div className="flex flex-wrap gap-2">
                {TOPICS.filter((t) => t !== "전체").map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewRoomTopic(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      newRoomTopic === t
                        ? "bg-sky-400 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">방 이름</p>
              <input
                autoFocus
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createRoom()}
                placeholder="방 이름을 입력하세요"
                maxLength={20}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-sky-300 transition"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={createRoom} disabled={!newRoomName.trim()}
                className="flex-1 py-3 rounded-2xl bg-sky-400 text-white text-sm font-black disabled:opacity-40 transition">
                만들기
              </button>
              <button onClick={() => setShowCreate(false)}
                className="px-5 py-3 rounded-2xl bg-gray-100 text-gray-500 text-sm font-bold transition">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

        {/* 주제 필터 탭 */}
        <div className="px-4 flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
          {TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTopic(t)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedTopic === t
                  ? "bg-sky-400 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-100 shadow-sm"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 방 목록 */}
        <div className="px-4 flex flex-col gap-2">
          {filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-300 gap-3">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <p className="text-sm">
                {selectedTopic === "전체" ? "아직 오픈채팅방이 없어요" : `${selectedTopic} 방이 없어요`}
              </p>
            </div>
          ) : filteredRooms.map((room) => (
            <button key={room.id} onClick={() => setCurrentRoom(room)}
              className="w-full bg-white rounded-2xl px-4 py-4 flex items-center gap-3 text-left hover:bg-gray-50 transition active:scale-[0.99] shadow-sm">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-base font-black ${TOPIC_COLORS[room.topic] || "bg-gray-100 text-gray-500"}`}>
                {room.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-gray-800 text-sm truncate">{room.name}</p>
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TOPIC_COLORS[room.topic] || "bg-gray-100 text-gray-500"}`}>
                    {room.topic}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">{room.lastMessage || "대화를 시작해보세요"}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
