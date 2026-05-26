"use client";

import { useEffect, useState, useRef } from "react";
import PageContainer from "../../components/PageContainer";
import EmojiPicker from "@/components/EmojiPicker";
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
  const [showEmoji, setShowEmoji] = useState(false);

  // 모바일 화면 상태
  const [mobileStep, setMobileStep] = useState<"list" | "chat">("list");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastNotifiedId = useRef<string | null>(null);

  const ADMIN_NAME = "관리자";

  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  const formatDate = (ts: any) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const formatTime = (ts: any) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
      const roomsRef = collection(db, "aroom");

      if (nickname === ADMIN_NAME) {
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

          if (!currentRoomId && userRooms.length > 0) {
            setCurrentRoomId(userRooms[0].id);
          }
        });

        return unsub;
      } else {
        const roomId = nickname;
        const roomRef = doc(db, "aroom", roomId);
        const docSnap = await getDoc(roomRef);

        if (!docSnap.exists()) {
          await setDoc(roomRef, {
            name: "관리자 톡",
            members: [nickname, ADMIN_NAME],
          });
        } else {
          const data = docSnap.data();
          if (!data.members.includes(nickname)) {
            await updateDoc(roomRef, {
              members: [...data.members, nickname],
            });
          }
        }

        setRooms([
          { id: roomId, name: "관리자 톡", members: [nickname, ADMIN_NAME] },
        ]);

        setCurrentRoomId(roomId);
      }
    };

    initRooms();
  }, [nickname]);

  // 메시지
  useEffect(() => {
    if (!currentRoomId || !nickname) return;

    const q = query(
      collection(db, "aroom", currentRoomId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({
        id: d.id,
        user: d.data().user,
        content: d.data().content,
        createdAt: d.data().createdAt,
        readBy: d.data().readBy || [],
      }));

      setMessages(msgs);

      snap.docChanges().forEach((change) => {
        if (
          change.type === "added" &&
          change.doc.data().user !== nickname &&
          document.hidden &&
          change.doc.id !== lastNotifiedId.current
        ) {
          lastNotifiedId.current = change.doc.id;

          new Notification(change.doc.data().user || "알림", {
            body: change.doc.data().content,
          });
        }
      });

      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        50
      );
    });

    return () => unsub();
  }, [currentRoomId, nickname]);

  const sendMessage = async () => {
    if (!input.trim() || !nickname || !currentRoomId) return;

    const text = input.trim();

    await addDoc(collection(db, "aroom", currentRoomId, "messages"), {
      user: nickname,
      content: text,
      createdAt: serverTimestamp(),
      readBy: [nickname],
    });

    const currentRoom = rooms.find((r) => r.id === currentRoomId);
    const targets = currentRoom?.members.filter((m) => m !== nickname) ?? [];
    if (targets.length > 0) {
      fetch("/api/fcm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toNicknames: targets,
          fromNickname: nickname,
          message: text.length > 60 ? text.slice(0, 60) + "…" : text,
          roomName: "관리자 톡",
          url: "/admintalk",
        }),
      }).catch(() => {});
    }

    setInput("");
  };

  if (!nickname) return <div>로딩중...</div>;

  const ChatUI = () => (
    <>
      {/* 모바일 헤더 */}
      <div className="md:hidden flex items-center gap-3 p-3 border-b">
        <button
          onClick={() => setMobileStep("list")}
          className="text-xl font-bold"
        >
          ←
        </button>
        <div className="font-semibold">
          {rooms.find((r) => r.id === currentRoomId)?.name}
        </div>
      </div>

      {/* 메시지 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.map((m, i) => {
          const prev = messages[i - 1];

          const showDate =
            !prev ||
            formatDate(prev.createdAt) !== formatDate(m.createdAt);

          return (
            <div key={m.id} className="flex flex-col">
              {showDate && (
                <div className="text-center text-xs text-gray-400 my-4">
                  ───── {formatDate(m.createdAt)} ─────
                </div>
              )}

              <div
                className={`flex flex-col max-w-xs ${
                  m.user === nickname
                    ? "self-end items-end"
                    : "self-start items-start"
                }`}
              >
                {/* 닉네임 */}
                <div className="text-xs text-gray-500 mb-1">
                  {m.user}
                </div>

                {/* 메시지 */}
                <div
                  className={`px-3 py-2 rounded-2xl ${
                    m.user === nickname
                      ? "bg-blue-100"
                      : "bg-white border"
                  }`}
                >
                  {m.content}
                </div>

                {/* 시간 */}
                <div className="text-[10px] text-gray-400">
                  {formatTime(m.createdAt) || "방금"}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 이모지 피커 */}
      {showEmoji && (
        <EmojiPicker
          onSelect={(e) => setInput((prev) => prev + e)}
          onClose={() => setShowEmoji(false)}
        />
      )}

      {/* 입력 */}
      <div className="flex border-t p-3 gap-2">
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg hover:bg-gray-200"
        >
          🙂
        </button>
        <input
          className="flex-1 border rounded-xl px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setShowEmoji(false)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} className="px-4 bg-blue-200 rounded-xl">
          전송
        </button>
      </div>
    </>
  );

  return (
    <PageContainer>
      <div className="flex h-screen">

        {/* 모바일 */}
        <div className="md:hidden w-full h-full">

          {mobileStep === "list" && (
            <div className="p-4">
              <div className="font-bold mb-3">채팅방</div>

              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="p-3 bg-gray-100 mb-2 rounded"
                  onClick={() => {
                    setCurrentRoomId(r.id);
                    setMobileStep("chat");
                  }}
                >
                  {r.name}
                </div>
              ))}
            </div>
          )}

          {mobileStep === "chat" && ChatUI()}
        </div>

        {/* PC */}
        <div className="hidden md:flex w-full">
          <div className="w-60 border-r p-4">
            <div className="font-bold mb-2">채팅방</div>

            {rooms.map((r) => (
              <div
                key={r.id}
                className="p-2 hover:bg-gray-200 cursor-pointer"
                onClick={() => setCurrentRoomId(r.id)}
              >
                {r.name}
              </div>
            ))}
          </div>

          <div className="flex-1 flex flex-col">
            {currentRoomId ? ChatUI() : (
              <div className="flex items-center justify-center h-full text-gray-400">
                채팅방 선택
              </div>
            )}
          </div>
        </div>

      </div>
    </PageContainer>
  );
}