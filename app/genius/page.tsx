"use client";

import { useState, useEffect, useRef } from "react";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
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
};

export default function ChatWithFirestore() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 🔔 수신음 관련
  const messageSound = useRef<HTMLAudioElement | null>(null);
  const prevMessageCount = useRef(0);

  /* ===============================
     로그인 + 닉네임 가져오기
  =============================== */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setNickname(userDoc.data().nickname || "유저");
        }
      } else {
        setNickname(null);
      }
    });
    return () => unsubscribe();
  }, []);

  /* ===============================
     수신음 오디오 준비
  =============================== */
  useEffect(() => {
    messageSound.current = new Audio("/sounds/message.mp3");
  }, []);

  /* ===============================
     Firestore 실시간 메시지 구독
  =============================== */
  useEffect(() => {
    if (!nickname) return;

    const messagesCol = collection(db, "messages");
    const q = query(messagesCol, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        user: doc.data().user,
        content: doc.data().content,
        createdAt: doc.data().createdAt,
      }));

      // 🔔 새 메시지 + 내가 보낸 게 아닐 때만 소리
      if (
        msgs.length > prevMessageCount.current &&
        msgs[msgs.length - 1]?.user !== nickname
      ) {
        messageSound.current?.play().catch(() => {});
      }

      prevMessageCount.current = msgs.length;
      setMessages(msgs);

      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });

    return () => unsubscribe();
  }, [nickname]);

  /* ===============================
     메시지 전송
  =============================== */
  const sendMessage = async () => {
    if (!input.trim() || !nickname) return;

    await addDoc(collection(db, "messages"), {
      user: nickname,
      content: input.trim(),
      createdAt: serverTimestamp(),
    });

    setInput("");
  };

  /* ===============================
     로그인 안 된 경우
  =============================== */
  if (!nickname) {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-white dark:bg-slate-800">
        <p className="text-lg text-gray-700 dark:text-white">
          로그인 후 채팅이 가능합니다.
        </p>
      </div>
    );
  }

  /* ===============================
     UI
  =============================== */
  return (
    <div className="fixed bottom-0 left-0 w-full flex flex-col bg-white dark:bg-slate-800 border-t border-gray-300 dark:border-slate-600 shadow-lg z-50">
      {/* 메시지 영역 */}
      <div className="h-[28rem] overflow-y-auto px-4 py-3 flex flex-col gap-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-xs px-3 py-2 rounded-xl break-words ${
              msg.user === nickname
                ? "self-end bg-amber-300 text-black"
                : "self-start bg-gray-200 dark:bg-slate-600 text-black dark:text-white"
            }`}
          >
            <div className="text-xs font-semibold opacity-70 mb-1">
              {msg.user}
            </div>
            <div>{msg.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="flex px-4 py-3 border-t border-gray-300 dark:border-slate-600 gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="메시지를 입력하세요..."
          className="flex-1 rounded-xl px-4 py-2 border border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          onClick={sendMessage}
          className="px-5 py-2 rounded-xl bg-amber-400 font-semibold hover:opacity-80 transition"
        >
          전송
        </button>
      </div>
    </div>
  );
}
