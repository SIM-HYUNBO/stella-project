"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

type Message = {
  id: string;
  user: string;
  content: string;
  createdAt?: any;
  readBy?: string[];
};

type Room = {
  id: string;
  name: string;
  members: string[];
};

export default function ChatPage() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastNotifiedId = useRef<string | null>(null);

  const ADMIN_NAME = "관리자";
  const USER_ROOM_ID = "관리자 톡"; // 유저가 항상 사용하는 방 ID

  // 알림 권한
  useEffect(() => {
    if (Notification.permission !== "granted") Notification.requestPermission();
  }, []);

  const formatDate = (ts: any) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const formatTime = (ts: any) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  };

  // 로그인
  useEffect(() => {
    const unsub = watchAuthState((user) => {
      if (user) setNickname(user.displayName || "유저");
    });
    return () => unsub();
  }, []);

  // 방 초기화
  useEffect(() => {
    if (!nickname) return;

    const initRooms = async () => {
      const roomsRef = collection(db, "arooms");

      if (nickname === ADMIN_NAME) {
        // 관리자: 모든 유저 방 목록
        const q = query(roomsRef);
        const unsub = onSnapshot(q, (snap) => {
          const userRooms: Room[] = snap.docs
            .map((d) => {
              const data = d.data();
              const members: string[] = data.members || [];
              const userName = members.find((m) => m !== ADMIN_NAME);
              if (!userName) return null;
              return { id: d.id, name: userName, members };
            })
            .filter(Boolean) as Room[];
          setRooms(userRooms);
          if (!currentRoomId && userRooms.length > 0) setCurrentRoomId(userRooms[0].id);
        });
        return unsub;
      } else {
        // 유저: 관리자 톡 1개
        const roomRef = doc(db, "arooms", USER_ROOM_ID);
        const docSnap = await getDoc(roomRef);
        if (!docSnap.exists()) {
          // 처음 접속 시 방 생성
          await setDoc(roomRef, { name: USER_ROOM_ID, members: [nickname, ADMIN_NAME] });
        } else {
          const data = docSnap.data();
          if (!data.members.includes(nickname)) {
            await updateDoc(roomRef, { members: [...data.members, nickname] });
          }
        }
        setRooms([{ id: USER_ROOM_ID, name: USER_ROOM_ID, members: [nickname, ADMIN_NAME] }]);
        setCurrentRoomId(USER_ROOM_ID);
      }
    };

    initRooms();
  }, [nickname]);

  // 메시지 구독
  useEffect(() => {
    if (!currentRoomId || !nickname) return;

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
        readBy: Array.isArray(d.data().readBy) ? d.data().readBy : [],
      }));

      setMessages(msgs);
      msgs.forEach(markAsRead);

      // 알림
      snap.docChanges().forEach((change) => {
        if (
          change.type === "added" &&
          change.doc.data().user !== nickname &&
          Notification.permission === "granted" &&
          document.hidden &&
          change.doc.id !== lastNotifiedId.current
        ) {
          lastNotifiedId.current = change.doc.id;
          new Notification(change.doc.data().user, {
            body: change.doc.data().content,
            icon: "/favicon.ico",
          });
        }
      });

      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });

    return () => unsub();
  }, [currentRoomId, nickname]);

  const markAsRead = async (msg: Message) => {
    if (!nickname || !currentRoomId) return;
    if (msg.readBy?.includes(nickname)) return;
    await updateDoc(doc(db, "rooms", currentRoomId, "messages", msg.id), {
      readBy: [...(msg.readBy || []), nickname],
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || !nickname || !currentRoomId) return;
    await addDoc(collection(db, "rooms", currentRoomId, "messages"), {
      user: nickname,
      content: input.trim(),
      createdAt: serverTimestamp(),
      readBy: [nickname],
    });
    setInput("");
  };

  if (!nickname) return <div>로딩중...</div>;

  return (
    <div className="flex h-screen">
      {/* 사이드바 */}
      <div className="w-60 border-r p-4 flex flex-col gap-2 bg-gray-50">
        <div className="font-bold mb-2">{nickname === ADMIN_NAME ? "유저 톡방" : "채팅방"}</div>
        {rooms.map((r) => (
          <button
            key={r.id}
            className={`p-2 rounded text-left ${
              r.id === currentRoomId ? "bg-gray-300" : "hover:bg-gray-200"
            }`}
            onClick={() => setCurrentRoomId(r.id)}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* 채팅 */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-10">아직 메시지가 없습니다.</div>
          )}
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const showDate =
              !prev ||
              m.createdAt?.toDate().toDateString() !== prev.createdAt?.toDate().toDateString();
            const showUser = !prev || prev.user !== m.user;

            return (
              <div key={m.id} className="flex flex-col">
                {showDate && (
                  <div className="text-center text-xs text-gray-400 my-4">
                    ───── {formatDate(m.createdAt)} ─────
                  </div>
                )}
                <div
                  className={`flex flex-col max-w-xs ${
                    m.user === nickname ? "self-end items-end" : "self-start items-start"
                  }`}
                >
                  {showUser && <div className="text-xs text-gray-500 mb-1">{m.user}</div>}
                  <div
                    className={`px-3 py-2 rounded-2xl ${
                      m.user === nickname ? "bg-blue-100" : "bg-white border"
                    }`}
                  >
                    {m.content}
                  </div>
                  <div className="text-[10px] text-gray-400">{formatTime(m.createdAt)}</div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex border-t p-3 gap-2 bg-gray-100">
          <input
            className="flex-1 border rounded-xl px-3 py-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="메시지 입력"
          />
          <button className="px-4 py-2 bg-blue-200 rounded-xl" onClick={sendMessage}>
            전송
          </button>
        </div>
      </div>
    </div>
  );
}