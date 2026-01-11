"use client";

import { useState, useEffect, useRef } from "react";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

type Message = {
  id: string;
  user: string; // 닉네임
  content: string;
  createdAt?: any;
};

export default function ChatWithFirestore() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 로그인 상태 체크 + 닉네임 가져오기
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) setNickname(userDoc.data().nickname || "유저");
      } else {
        setNickname(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore 메시지 실시간 구독
  useEffect(() => {
    const messagesCol = collection(db, "messages");
    const q = query(messagesCol, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        user: doc.data().user,
        content: doc.data().content,
        createdAt: doc.data().createdAt,
      }));
      setMessages(msgs);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return () => unsubscribe();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !nickname) return;
    const messagesCol = collection(db, "messages");
    await addDoc(messagesCol, {
      user: nickname,
      content: input.trim(),
      createdAt: serverTimestamp(),
    });
    setInput("");
  };

  if (!nickname) {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-white dark:bg-slate-800 p-4">
        <p className="text-lg text-gray-700 dark:text-white">로그인 후 채팅이 가능합니다.</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 w-full flex flex-col bg-white dark:bg-slate-800 border-t border-gray-300 dark:border-slate-600 shadow-lg z-50">
      {/* 메시지 영역 */}
      <div className="h-96 overflow-y-auto px-4 py-2 flex flex-col gap-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-xs break-words px-3 py-1 rounded-lg ${
              msg.user === nickname
                ? "self-end bg-amber-300 text-black"
                : "self-start bg-gray-200 dark:bg-slate-600 text-black dark:text-white"
            }`}
          >
            <span className="font-semibold text-sm">{msg.user}: </span>
            <span>{msg.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="flex px-4 py-2 border-t border-gray-300 dark:border-slate-600 gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="메시지를 입력하세요..."
          className="flex-1 rounded-xl border border-gray-300 dark:border-slate-500 px-3 py-2 bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-amber-300 dark:bg-amber-500 rounded-xl font-semibold hover:opacity-80 transition"
        >
          전송
        </button>
      </div>
    </div>
  );
}
