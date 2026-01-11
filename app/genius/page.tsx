"use client";

import { useState, useEffect, useRef } from "react";
import ArtBoard from "../../components/art";
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

type Category = "공부" | "미술" | "노래/댄스" | "얼굴";

export default function ChatWithFirestore() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [category, setCategory] = useState<Category>("공부");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageSound = useRef<HTMLAudioElement | null>(null);
  const prevMessageCount = useRef(0);

  /* 로그인 + 닉네임 */
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return setNickname(null);

      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setNickname(snap.data().nickname || "유저");
    });
  }, []);

  /* 수신음 */
  useEffect(() => {
    messageSound.current = new Audio("/sounds/message.mp3");
  }, []);

  /* 메시지 구독 */
  useEffect(() => {
    if (!nickname) return;

    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({
        id: d.id,
        user: d.data().user,
        content: d.data().content,
        createdAt: d.data().createdAt,
      }));

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
  }, [nickname]);

  const sendMessage = async () => {
    if (!input.trim() || !nickname) return;

    await addDoc(collection(db, "messages"), {
      user: nickname,
      content: input.trim(),
      createdAt: serverTimestamp(),
    });
    setInput("");
  };

  if (!nickname) {
    return <div className="fixed inset-0 flex items-center justify-center">로그인 필요</div>;
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-white">

      {/* 상단 */}
      <div className="bg-amber-100 border-b">
        <div className="h-12 flex items-center justify-center font-extrabold">
          천왁즈 · {category}
        </div>

        <div className="flex justify-around pb-2">
          {["공부", "미술", "노래/댄스", "얼굴"].map((t) => (
            <button
              key={t}
              onClick={() => setCategory(t as Category)}
              className={`px-4 py-2 rounded-xl ${
                category === t ? "bg-amber-300 font-bold" : "hover:bg-amber-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

     {category === "미술" && (
  <div className="px-4 py-2">
    <ArtBoard roomId="global-room" />
  </div>
)}


      </div>

      {/* 채팅 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-xs px-3 py-2 rounded-xl ${
              m.user === nickname ? "self-end bg-amber-300" : "self-start bg-gray-200"
            }`}
          >
            <div className="text-xs font-semibold opacity-70">{m.user}</div>
            {m.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 */}
      <div className="flex px-4 py-3 border-t gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 rounded-xl px-4 py-2 border"
        />
        <button
          onClick={sendMessage}
          className="px-5 py-2 rounded-xl bg-amber-400 font-semibold"
        >
          전송
        </button>
      </div>
    </div>
  );
}
