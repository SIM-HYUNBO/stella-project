"use client";

import { useState, useEffect, useRef } from "react";
import { auth, db } from "@/app/firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  arrayRemove,
} from "firebase/firestore";

type Message = { id: string; user: string; content: string; createdAt?: any };
type Room = { id: string; name: string; members: string[] };

export default function ChatWithRooms() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [isContracted, setIsContracted] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [contractUsers, setContractUsers] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showRoomActions, setShowRoomActions] = useState<string | null>(null);

  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  const clickCount = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageSound = useRef<HTMLAudioElement | null>(null);

  const alwaysDisplayed = ["관리자", "나율", "프레드"];

  useEffect(() => {
    return auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setNickname(null);
        setIsContracted(false);
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const nick = snap.data().nickname || "유저";
        setNickname(nick);
        setIsContracted(!!snap.data().isContracted);
        const usersSnap = await getDoc(doc(db, "meta", "contractUsers"));
        if (usersSnap.exists()) {
          const allUsers: string[] = usersSnap.data().users || [];
          setContractUsers(Array.from(new Set(allUsers)));
        }
      } else {
        setNickname("유저");
        setIsContracted(false);
      }
    });
  }, []);

  useEffect(() => {
    messageSound.current = new Audio("/sounds/message.mp3");
  }, []);

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

  useEffect(() => {
    if (!currentRoomId) return;
    const localMessages = localStorage.getItem(`chat_${currentRoomId}`);
    if (localMessages) setMessages(JSON.parse(localMessages));
    else setMessages([]);

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
      if (msgs.length > 0) messageSound.current?.play().catch(() => {});
      setMessages(msgs);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      localStorage.setItem(`chat_${currentRoomId}`, JSON.stringify(msgs));
    });
    return () => unsub();
  }, [currentRoomId]);

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
    if (msg.user !== nickname || msg.user === "system") return;
    const updated = messages.filter((m) => m.id !== msg.id);
    setMessages(updated);
    localStorage.setItem(`chat_${currentRoomId!}`, JSON.stringify(updated));
    try {
      const docRef = doc(db, "rooms", currentRoomId!, "messages", msg.id);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn("Firestore 메시지 삭제 실패", e);
    }
    setSelectedMessageId(null);
  };

  const leaveRoom = async (roomId: string) => {
    if (!nickname) return;
    const docRef = doc(db, "rooms", roomId);
    await updateDoc(docRef, {
      members: arrayRemove(nickname),
    });

    // 방 혼자 남으면 삭제
    const roomSnap = await getDoc(docRef);
    if (roomSnap.exists()) {
      const members: string[] = roomSnap.data().members || [];
      if (members.length <= 1) {
        try {
          // Firestore 방 삭제
          await deleteDoc(docRef);
        } catch {}
      }
    }

    if (currentRoomId === roomId) setCurrentRoomId(null);
    setShowRoomActions(null);
  };

  const handleRoomClick = (roomId: string) => {
    clickCount.current += 1;
    if (clickTimeout.current) clearTimeout(clickTimeout.current);

    clickTimeout.current = setTimeout(() => {
      if (clickCount.current === 1) {
        // 한 번 클릭 → 채팅 시작
        setCurrentRoomId(roomId);
        setShowRoomActions(null);
      } else if (clickCount.current === 2) {
        // 두 번 클릭 → 탈퇴/초대 버튼 표시
        setShowRoomActions(roomId);
      }
      clickCount.current = 0;
    }, 250);
  };

  const alwaysAllowed = ["관리자", "나율", "프레드"];
  if (!nickname) return <div>로딩중...</div>;
  if (!alwaysAllowed.includes(nickname) && isContracted === false) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <p className="mb-4 text-lg">계약 회원만 이용할 수 있습니다.</p>
        <button
          onClick={() => (window.location.href = "/contract")}
          className="px-4 py-2 rounded bg-amber-400 font-bold"
        >
          계약하러 가기
        </button>
      </div>
    );
  }

  const createRoom = async () => {
    if (!nickname) return;
    const members = [nickname, ...selectedUsers];
    const docRef = await addDoc(collection(db, "rooms"), {
      name: newRoomName || "천왁즈",
      members,
    });
    await addDoc(collection(db, "rooms", docRef.id, "messages"), {
      user: "system",
      content: `${nickname} 님이 입장하였습니다`,
      createdAt: serverTimestamp(),
    });
    setCurrentRoomId(docRef.id);
    setSelectedUsers([]);
    setNewRoomName("");
    setIsCreateModalOpen(false);
  };

  return (
    <div className="flex fixed inset-0 bg-white">
      <div className="w-64 border-r p-4 flex flex-col gap-4">
        <button
          className="px-3 py-2 bg-amber-400 rounded font-bold hover:bg-amber-500"
          onClick={() => setIsCreateModalOpen(true)}
        >
          새 방 만들기
        </button>

        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded shadow-md w-80 flex flex-col gap-3">
              <h2 className="font-bold text-lg">새 방 만들기</h2>
              <input
                type="text"
                placeholder="방 이름 입력"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="px-3 py-2 border rounded"
              />
              <div className="flex flex-col max-h-64 overflow-y-auto border p-2 rounded gap-1">
                {alwaysDisplayed.map((user) => (
                  <label key={user} className="flex items-center gap-2 font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedUsers([...selectedUsers, user]);
                        else setSelectedUsers(selectedUsers.filter((u) => u !== user));
                      }}
                    />
                    {user} (항상 표시)
                  </label>
                ))}
                {contractUsers
                  .filter((u) => !alwaysDisplayed.includes(u))
                  .map((user) => (
                    <label key={user} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedUsers([...selectedUsers, user]);
                          else setSelectedUsers(selectedUsers.filter((u) => u !== user));
                        }}
                      />
                      {user}
                    </label>
                  ))}
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  className="px-3 py-1 bg-gray-300 rounded"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  취소
                </button>
                <button
                  className="px-3 py-1 bg-amber-400 rounded font-bold"
                  onClick={createRoom}
                >
                  생성
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 font-semibold">내 방 목록</div>
        <div className="flex flex-col max-h-64 overflow-y-auto border p-2 rounded gap-1">
          {rooms
            .filter((r) => Array.isArray(r.members) && r.members.includes(nickname!))
            .map((r) => (
              <div
                key={r.id}
                onClick={() => handleRoomClick(r.id)}
                className={`px-2 py-1 rounded hover:bg-gray-200 cursor-pointer ${
                  r.id === currentRoomId ? "bg-gray-300" : ""
                }`}
              >
                {r.name}
                {showRoomActions === r.id && (
                  <div className="flex gap-2 mt-1">
                    <button
                      className="px-2 py-1 bg-red-300 rounded text-xs"
                      onClick={() => leaveRoom(r.id)}
                    >
                      탈퇴
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          {currentRoomId ? (
            messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-xs px-3 py-2 rounded-xl relative ${
                  m.user === nickname
                    ? "self-end bg-red-100"
                    : m.user === "system"
                    ? "self-center bg-gray-300 font-semibold text-sm"
                    : "self-start bg-gray-200"
                }`}
                onClick={() =>
                  m.user === nickname && m.user !== "system"
                    ? setSelectedMessageId(m.id === selectedMessageId ? null : m.id)
                    : null
                }
              >
                {m.user !== "system" && <div className="text-xs font-semibold opacity-70">{m.user}</div>}
                {m.content}
                {selectedMessageId === m.id && m.user === nickname && (
                  <button
                    onClick={() => deleteMessage(m)}
                    className="absolute -top-2 -right-2 bg-red-400 text-white text-xs px-2 py-1 rounded"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">
              방을 선택해 주세요
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {currentRoomId && (
          <div className="flex p-4 border-t gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 rounded-xl px-4 py-2 border"
              placeholder="메시지 입력..."
            />
            <button
              onClick={sendMessage}
              className="px-5 py-2 rounded-xl bg-yellow-200 font-semibold"
            >
              전송
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
