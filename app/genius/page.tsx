"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDocs,
} from "firebase/firestore";

type Message = { id: string; user: string; content: string; createdAt?: any };
type Room = { id: string; name: string; members: string[] };

export default function ChatWithSidebar() {
  const router = useRouter();

  const [nickname, setNickname] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [longPressedRoomId, setLongPressedRoomId] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteUsers, setInviteUsers] = useState<string[]>([]);

  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageSound = useRef<HTMLAudioElement | null>(null);
  const userInteracted = useRef(false);

  const alwaysDisplayed = ["관리자", "나율", "프레드"];

  // 로그인 상태 추적
  useEffect(() => {
    const unsub = watchAuthState(async (user) => {
      if (user) setNickname(user.displayName || "유저");
      else setNickname(null);
    });
    return () => unsub();
  }, []);

  // 가입 회원 목록 가져오기
  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const users: string[] = snap.docs.map(d => d.data().nickname || "유저");
      setAllUsers(Array.from(new Set(users)));
    };
    fetchUsers();
  }, []);

  // 메시지 사운드 초기화
  useEffect(() => {
    messageSound.current = new Audio("/sounds/message.mp3");
    messageSound.current.volume = 1;
  }, []);

  // 브라우저 정책 대응: 첫 클릭/터치 후 재생 허용
  useEffect(() => {
    const handleUserInteraction = () => {
      userInteracted.current = true;
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
    };
    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("touchstart", handleUserInteraction);
    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
    };
  }, []);

  // 방 목록 구독
  useEffect(() => {
    const q = query(collection(db, "rooms"));
    const unsub = onSnapshot(q, (snap) => {
      const r: Room[] = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name,
        members: d.data().members || [],
      }));
      setRooms(r);
    });
    return () => unsub();
  }, []);

  // 메시지 구독 + 알림음 재생
  useEffect(() => {
    if (!currentRoomId) return;

    const stored = localStorage.getItem(`chat_${currentRoomId}`);
    if (stored) setMessages(JSON.parse(stored));

    const q = query(
      collection(db, "rooms", currentRoomId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({
        id: d.id,
        user: d.data().user,
        content: d.data().content,
        createdAt: d.data().createdAt,
      }));

      const lastMsg = msgs[msgs.length - 1];
      if (
        lastMsg &&
        lastMsg.user !== nickname &&
        userInteracted.current &&
        messageSound.current
      ) {
        messageSound.current.currentTime = 0;
        messageSound.current
          .play()
          .catch(() =>
            console.log("자동 재생 차단됨, 사용자 클릭 후 테스트 필요")
          );
      }

      setMessages(msgs);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      localStorage.setItem(`chat_${currentRoomId}`, JSON.stringify(msgs));
    });
    return () => unsub();
  }, [currentRoomId, nickname]);

  const sendMessage = async () => {
    if (!input.trim() || !nickname || !currentRoomId) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      user: nickname,
      content: input.trim(),
      createdAt: new Date(),
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    localStorage.setItem(`chat_${currentRoomId}`, JSON.stringify(updated));
    setInput("");

    await addDoc(collection(db, "rooms", currentRoomId, "messages"), {
      user: nickname,
      content: newMsg.content,
      createdAt: serverTimestamp(),
    });
  };

  const deleteMessage = async (msg: Message) => {
    if (!msg.id) return;

    try {
      const docRef = doc(db, "rooms", currentRoomId!, "messages", msg.id);
      await deleteDoc(docRef);
    } catch {
      // Firestore 실패 시 로컬 삭제
    }

    const updated = messages.filter((m) => m.id !== msg.id);
    setMessages(updated);
    localStorage.setItem(`chat_${currentRoomId}`, JSON.stringify(updated));
    setSelectedMessageId(null);
  };

  const createRoom = async () => {
    if (!nickname) return;
    const members = [nickname];
    const docRef = await addDoc(collection(db, "rooms"), { name: newRoomName || "새 방", members });

    await addDoc(collection(db, "rooms", docRef.id, "messages"), {
      user: "system",
      content: `${nickname}님이 입장하였습니다`,
      createdAt: serverTimestamp(),
    });

    setCurrentRoomId(docRef.id);
    setNewRoomName("");
    setIsCreateModalOpen(false);
  };

  const leaveRoom = async (roomId: string) => {
    if (!nickname) return;

    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    await updateDoc(doc(db, "rooms", roomId), { members: arrayRemove(nickname) });
    await addDoc(collection(db, "rooms", roomId, "messages"), {
      user: "system",
      content: `${nickname}님이 탈퇴하였습니다`,
      createdAt: serverTimestamp(),
    });

    if (room.members.filter(m => m !== nickname).length === 0) {
      await deleteDoc(doc(db, "rooms", roomId));
    }

    if (currentRoomId === roomId) setCurrentRoomId(null);
    setLongPressedRoomId(null);
  };

  const inviteToRoom = async () => {
    if (!nickname || !longPressedRoomId) return;
    const docRef = doc(db, "rooms", longPressedRoomId);
    for (const user of inviteUsers) {
      await updateDoc(docRef, { members: arrayUnion(user) });
      await addDoc(collection(docRef, "messages"), {
        user: "system",
        content: `${user}님이 초대되었습니다`,
        createdAt: serverTimestamp(),
      });
    }
    setInviteUsers([]);
    setInviteModalOpen(false);
    setLongPressedRoomId(null);
  };

  if (!nickname) return <div>로딩중...</div>;

  return (
    <div className="flex h-screen">
      {/* 사이드바 */}
      <div className={`bg-white border-r w-64 p-4 flex flex-col gap-4 ${isMobileChatOpen ? "hidden" : "flex"}`}>
        <button className="px-3 py-2 bg-amber-400 rounded font-bold" onClick={() => setIsCreateModalOpen(true)}>새 방 만들기</button>

        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded shadow-md w-80 flex flex-col gap-3">
              <h2 className="font-bold text-lg">새 방 만들기</h2>
              <input
                type="text"
                placeholder="방 이름"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="px-3 py-2 border rounded"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button className="px-3 py-1 bg-gray-300 rounded" onClick={() => setIsCreateModalOpen(false)}>취소</button>
                <button className="px-3 py-1 bg-amber-400 rounded font-bold" onClick={createRoom}>생성</button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 font-semibold">내 방 목록</div>
        <div className="flex flex-col max-h-64 overflow-y-auto border p-2 rounded gap-1">
          {rooms.filter(r => r.members.includes(nickname!)).map(r => {
            let touchTimer: NodeJS.Timeout;
            return (
              <div
                key={r.id}
                className={`px-2 py-1 rounded hover:bg-gray-200 cursor-pointer ${r.id === currentRoomId ? "bg-gray-300" : ""}`}
                onClick={() => { setCurrentRoomId(r.id); if (window.innerWidth <= 768) setIsMobileChatOpen(true); }}
                onDoubleClick={() => setLongPressedRoomId(r.id)}
                onTouchStart={() => {
                  touchTimer = setTimeout(() => setLongPressedRoomId(r.id), 600);
                }}
                onTouchEnd={() => clearTimeout(touchTimer)}
              >
                {r.name}
                {longPressedRoomId === r.id && (
                  <div className="flex gap-2 mt-1">
                    <button className="px-2 py-1 bg-red-300 rounded text-xs" onClick={() => leaveRoom(r.id)}>탈퇴</button>
                    <button className="px-2 py-1 bg-green-300 rounded text-xs" onClick={() => setInviteModalOpen(true)}>초대</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 초대 모달 */}
        {inviteModalOpen && longPressedRoomId && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded shadow-md w-80 flex flex-col gap-2">
              <h3 className="font-bold">회원 초대</h3>
              <div className="flex flex-col max-h-64 overflow-y-auto border p-2 rounded gap-1">
                {[...alwaysDisplayed, ...allUsers]
                  .filter(u => !rooms.find(r => r.id === longPressedRoomId)?.members.includes(u))
                  .map(user => (
                    <label key={user} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={inviteUsers.includes(user)}
                        onChange={(e) => {
                          if (e.target.checked) setInviteUsers([...inviteUsers, user]);
                          else setInviteUsers(inviteUsers.filter(u => u !== user));
                        }}
                      />
                      {user}
                    </label>
                  ))}
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button className="px-3 py-1 bg-gray-300 rounded" onClick={() => setInviteModalOpen(false)}>취소</button>
                <button className="px-3 py-1 bg-green-400 rounded font-bold" onClick={inviteToRoom}>초대</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 채팅 영역 */}
      {currentRoomId && (
        <div className={`flex-1 flex flex-col h-screen ${isMobileChatOpen ? "flex" : "hidden md:flex"}`}>
          <div className="fixed top-0 left-0 right-0 h-12 bg-white border-b flex items-center justify-center z-10 px-4">
            <button className="absolute left-4 text-xl font-bold md:hidden" onClick={() => setIsMobileChatOpen(false)}>&lt;</button>
            <span className="font-bold text-lg">{rooms.find(r => r.id === currentRoomId)?.name || "방 선택"}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 mt-12">
            {messages.map(m => (
              <div key={m.id} className={`max-w-xs px-3 py-2 rounded-xl relative ${m.user === nickname ? "self-end bg-red-100" : "self-start bg-gray-200"}`} onClick={() => m.user === nickname && setSelectedMessageId(m.id)}>
                <div className="text-xs font-semibold opacity-70">{m.user}</div>
                {m.content}
                {selectedMessageId === m.id && (
                  <button className="absolute top-0 right-0 text-xs bg-red-400 rounded px-1" onClick={() => deleteMessage(m)}>삭제</button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex p-4 border-t gap-2 mt-auto">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} className="flex-1 rounded-xl px-4 py-2 border" placeholder="메시지 입력..." />
            <button onClick={sendMessage} className="px-5 py-2 rounded-xl bg-yellow-200 font-semibold">전송</button>
          </div>
        </div>
      )}
    </div>
  );
}
