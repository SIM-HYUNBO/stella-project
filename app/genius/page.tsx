"use client";

import { useState, useEffect, useRef } from "react";
import { auth, db } from "@/app/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

type Message = { id: string; user: string; content: string; createdAt?: any };

export default function SimpleChat() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageSound = useRef<HTMLAudioElement | null>(null);

  const roomId = "defaultRoom"; // 단일 방

  // 로그인 처리
  useEffect(() => {
    return auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setNickname(null);
        return;
      }
      setNickname(user.displayName || "유저");
    });
  }, []);

  // 메시지 알림 사운드
  useEffect(() => {
    messageSound.current = new Audio("/sounds/message.mp3");
  }, []);

  // 메시지 구독 + 로컬 저장
  useEffect(() => {
    const localMessages = localStorage.getItem(`chat_${roomId}`);
    if (localMessages) setMessages(JSON.parse(localMessages));

    const q = query(
      collection(db, "rooms", roomId, "messages"),
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

      localStorage.setItem(`chat_${roomId}`, JSON.stringify(msgs));
    });
    return () => unsub();
  }, []);

  // 메시지 전송
  const sendMessage = async () => {
    if (!input.trim() || !nickname) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      user: nickname,
      content: input.trim(),
      createdAt: new Date(),
    };

    // 로컬 반영
    const updated = [...messages, newMsg];
    setMessages(updated);
    localStorage.setItem(`chat_${roomId}`, JSON.stringify(updated));
    setInput("");

    // Firestore 반영
    await addDoc(collection(db, "rooms", roomId, "messages"), {
      user: nickname,
      content: newMsg.content,
      createdAt: serverTimestamp(),
    });
  };

  // 메시지 삭제 (내 메시지만)
  const deleteMessage = async (msg: Message) => {
    if (!msg.id) return;

    try {
      const docRef = doc(db, "rooms", roomId, "messages", msg.id);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn("Firestore 삭제 실패, 로컬만 삭제:", e);
    }

    const updated = messages.filter((m) => m.id !== msg.id);
    setMessages(updated);
    localStorage.setItem(`chat_${roomId}`, JSON.stringify(updated));
    setSelectedMessageId(null);
  };

  if (!nickname) return <div>로딩중...</div>;

  return (
    <div className="flex flex-col h-screen">
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-xs px-3 py-2 rounded-xl relative ${
              m.user === nickname ? "self-end bg-red-100" : "self-start bg-gray-200"
            }`}
            onClick={() => m.user === nickname && setSelectedMessageId(m.id)}
          >
            <div className="text-xs font-semibold opacity-70">{m.user}</div>
            {m.content}
            {selectedMessageId === m.id && (
              <button
                className="absolute top-0 right-0 text-xs bg-red-400 rounded px-1"
                onClick={() => deleteMessage(m)}
              >
                삭제
              </button>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
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
    </div>
  );
}
