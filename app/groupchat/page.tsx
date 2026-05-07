"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "../../components/PageContainer";
import { db, storage } from "@/app/firebase";
import { watchAuthState } from "../authService";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  where,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

type GroupRoom = {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt?: any;
};

type GroupMessage = {
  id: string;
  from: string;
  content: string;
  type?: "text" | "image";
  createdAt?: any;
  readBy?: string[];
};

type User = {
  id: string;
  nickname: string;
};

export default function GroupChat() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [rooms, setRooms] = useState<GroupRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GroupRoom | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [inviting, setInviting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const unsub = watchAuthState((user) => {
      if (user) setNickname(user.displayName || "유저");
      else router.replace("/login");
    });
    return () => unsub();
  }, []);

  // 내가 속한 방 목록 실시간 로드
  useEffect(() => {
    if (!nickname) return;
    const q = query(
      collection(db, "group_rooms"),
      where("members", "array-contains", nickname)
    );
    return onSnapshot(q, (snap) => {
      const list: GroupRoom[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<GroupRoom, "id">),
      }));
      list.sort((a, b) => {
        const ta = a.createdAt?.toDate?.()?.getTime() ?? 0;
        const tb = b.createdAt?.toDate?.()?.getTime() ?? 0;
        return tb - ta;
      });
      setRooms(list);
    });
  }, [nickname]);

  // rooms가 바뀔 때마다 currentRoom 최신 데이터로 동기화
  useEffect(() => {
    if (!currentRoom) return;
    const updated = rooms.find((r) => r.id === currentRoom.id);
    if (updated) setCurrentRoom(updated);
    else setCurrentRoom(null);
  }, [rooms]);

  // 방 내 메시지 실시간 로드
  useEffect(() => {
    if (!currentRoom || !nickname) return;
    isInitialLoad.current = true;
    const q = query(
      collection(db, "group_rooms", currentRoom.id, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, async (snap) => {
      const msgs: GroupMessage[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        const m: GroupMessage = {
          id: d.id,
          from: data.from,
          content: data.content,
          type: data.type || "text",
          createdAt: data.createdAt,
          readBy: data.readBy || [],
        };
        if (m.from !== nickname && !m.readBy?.includes(nickname)) {
          await updateDoc(
            doc(db, "group_rooms", currentRoom.id, "messages", m.id),
            { readBy: arrayUnion(nickname) }
          );
        }
        msgs.push(m);
      }
      isInitialLoad.current = false;
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
    return () => unsub();
  }, [currentRoom?.id, nickname]);

  // 전체 사용자 목록 로드 (초대용) - 실시간으로 유지
  useEffect(() => {
    if (!nickname) return;
    return onSnapshot(collection(db, "users"), (snap) => {
      const list: User[] = snap.docs
        .map((d) => ({ id: d.id, nickname: d.data().nickname as string }))
        .filter((u) => u.nickname !== nickname);
      setAllUsers(list);
    });
  }, [nickname]);

  const createRoom = async () => {
    if (!newRoomName.trim() || !nickname) return;
    await addDoc(collection(db, "group_rooms"), {
      name: newRoomName.trim(),
      members: [nickname],
      createdBy: nickname,
      createdAt: serverTimestamp(),
    });
    setNewRoomName("");
    setShowCreate(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !nickname || !currentRoom) return;
    await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), {
      from: nickname,
      content: input.trim(),
      type: "text",
      createdAt: serverTimestamp(),
      readBy: [nickname],
    });
    setInput("");
  };

  const sendImage = async (file: File) => {
    if (!nickname || !currentRoom) return;
    setImgUploading(true);
    try {
      const sRef = storageRef(storage, `group-images/${currentRoom.id}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(sRef, file);
      const url = await getDownloadURL(snapshot.ref);
      await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), {
        from: nickname,
        content: url,
        type: "image",
        createdAt: serverTimestamp(),
        readBy: [nickname],
      });
    } catch {
      alert("이미지 전송에 실패했습니다.");
    } finally {
      setImgUploading(false);
    }
  };

  const inviteUser = async (targetNickname: string) => {
    if (!currentRoom || inviting) return;
    setInviting(true);
    try {
      await updateDoc(doc(db, "group_rooms", currentRoom.id), {
        members: arrayUnion(targetNickname),
      });
      setShowInvite(false);
      alert(`${targetNickname}님을 초대했습니다.`);
    } catch (err: any) {
      alert(`초대 실패: ${err?.message || "알 수 없는 오류"}`);
    } finally {
      setInviting(false);
    }
  };

  const leaveRoom = async () => {
    if (!currentRoom || !nickname) return;
    if (!confirm(`"${currentRoom.name}" 방에서 나가시겠습니까?`)) return;
    await updateDoc(doc(db, "group_rooms", currentRoom.id), {
      members: arrayRemove(nickname),
    });
    setCurrentRoom(null);
  };

  const playNotificationSound = () => {
    const audio = new Audio("/sounds/alert1.mp3");
    audio.play().catch(() => {});
  };

  if (!nickname) return <div className="flex items-center justify-center h-screen">로딩중...</div>;

  // 초대 모달
  const renderInviteModal = () => {
    if (!showInvite || !currentRoom) return null;
    const notInRoom = allUsers.filter((u) => !currentRoom.members.includes(u.nickname));
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowInvite(false)}>
        <div className="bg-white rounded-2xl p-5 w-72 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="font-bold text-base mb-3">사용자 초대</div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {notInRoom.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-4">초대할 사용자가 없습니다</div>
            )}
            {notInRoom.map((u) => (
              <button
                key={u.id}
                disabled={inviting}
                onClick={() => inviteUser(u.nickname)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                  {u.nickname[0]}
                </div>
                <span className="text-sm">{u.nickname}</span>
                {inviting && <span className="ml-auto text-xs text-gray-400">초대 중...</span>}
              </button>
            ))}
          </div>
          <button onClick={() => setShowInvite(false)} className="mt-3 text-sm text-gray-400 hover:text-gray-600">닫기</button>
        </div>
      </div>
    );
  };

  // 채팅 화면
  const renderRoom = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentRoom(null)}
            className="text-gray-500 hover:text-gray-700 text-lg"
          >←</button>
          <div>
            <div className="font-bold text-sm">{currentRoom?.name}</div>
            <div className="text-xs text-gray-400">{currentRoom?.members.length}명</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInvite(true)}
            className="text-sm px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
          >
            초대
          </button>
          <button
            onClick={leaveRoom}
            className="text-sm px-3 py-1.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
          >
            나가기
          </button>
        </div>
      </div>

      {/* 멤버 표시 */}
      <div className="px-4 py-1.5 bg-gray-50 border-b shrink-0">
        <div className="text-xs text-gray-400 truncate">
          👥 {currentRoom?.members.join(", ")}
        </div>
      </div>

      {/* 메시지 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
        {messages.map((m, i) => {
          const isMine = m.from === nickname;
          const prev = messages[i - 1];
          const showUser = !prev || prev.from !== m.from;
          const currentDate = formatDateLabel(m.createdAt);
          const prevDate = i > 0 ? formatDateLabel(messages[i - 1].createdAt) : null;
          const showDate = currentDate !== prevDate;

          return (
            <div key={m.id}>
              {showDate && (
                <div className="flex items-center justify-center text-xs text-gray-400 w-full my-2">
                  <div className="flex-1 border-t" />
                  <span className="px-2">{currentDate}</span>
                  <div className="flex-1 border-t" />
                </div>
              )}
              <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`flex items-end gap-1 max-w-[75%] ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                  {!isMine && (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0 mb-1">
                      {m.from[0]}
                    </div>
                  )}
                  <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                    {showUser && !isMine && (
                      <div className="text-xs text-gray-500 mb-0.5">{m.from}</div>
                    )}
                    <div className={`bubble px-3 py-2 text-sm ${isMine
                      ? "bubble-mine bg-red-100 rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-md"
                      : "bubble-other bg-gray-200 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-md"
                    }`}>
                      {m.type === "image" ? (
                        <img
                          src={m.content}
                          alt="이미지"
                          className="max-w-[200px] max-h-[200px] rounded-xl object-cover cursor-pointer"
                          onClick={() => window.open(m.content, "_blank")}
                        />
                      ) : (
                        <span className="break-words whitespace-pre-wrap">{m.content}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{formatTime(m.createdAt)}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <div className="flex border-t p-3 gap-2 items-center bg-white shrink-0">
        <button
          onClick={() => imageInputRef.current?.click()}
          className={`text-xl shrink-0 transition-colors ${imgUploading ? "text-gray-300 animate-pulse" : "text-gray-400 hover:text-blue-500"}`}
          disabled={imgUploading}
          title="사진 전송"
        >
          📷
        </button>
        <input
          type="file" ref={imageInputRef} accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = ""; }}
        />
        <input
          className="flex-1 border rounded-xl px-3 py-2 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="메시지 입력"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-yellow-200 hover:bg-yellow-300 rounded-xl text-sm shrink-0 transition-colors"
        >
          전송
        </button>
      </div>
    </div>
  );

  // 방 목록 화면
  const renderRoomList = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="font-bold text-gray-800">단체 채팅</div>
      </div>

      <div className="px-4 py-3 border-b shrink-0">
        {showCreate ? (
          <div className="flex flex-col gap-2">
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm"
              placeholder="방 이름 입력"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createRoom()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={createRoom}
                className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-sm hover:bg-blue-600 transition-colors"
              >
                만들기
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewRoomName(""); }}
                className="flex-1 py-2 bg-gray-100 rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors"
          >
            + 방 만들기
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {rooms.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-8 flex flex-col items-center gap-2">
            <div className="text-3xl">💬</div>
            <div>참여 중인 단체 채팅방이 없습니다</div>
            <div className="text-xs">방을 만들거나 초대를 받아 보세요</div>
          </div>
        )}
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => setCurrentRoom(room)}
            className="w-full flex items-center gap-3 p-3 rounded-xl mb-2 bg-white hover:bg-gray-50 border transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-base font-bold text-blue-600 shrink-0">
              {room.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-800">{room.name}</div>
              <div className="text-xs text-gray-400 truncate">멤버 {room.members.length}명</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <PageContainer>
        <div className="h-screen flex flex-col">
          {currentRoom ? renderRoom() : renderRoomList()}
          {renderInviteModal()}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="h-screen flex overflow-hidden">
        <div className="w-64 border-r flex flex-col">{renderRoomList()}</div>
        <div className="flex-1 flex flex-col">
          {currentRoom ? renderRoom() : (
            <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-2">
              <div className="text-4xl">💬</div>
              <div>채팅방을 선택하거나 새로 만들어 보세요</div>
            </div>
          )}
        </div>
      </div>
      {renderInviteModal()}
    </PageContainer>
  );
}

const formatTime = (ts: any) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
};

const formatDateLabel = (ts: any) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("ko-KR");
};
