"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/app/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

type Message = {
  id: string;
  from: string;
  content: string;
  createdAt?: any;
};

export default function MeatChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  /* ================= 고기 상태 ================= */
  const [startTime, setStartTime] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [state, setState] = useState<
    "raw" | "grilling" | "perfect" | "burn"
  >("raw");

  const me = "나율";

  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* ================= 채팅 ================= */
  useEffect(() => {
    const q = query(collection(db, "meat_chat"), orderBy("createdAt", "asc"));

    return onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }))
      );
    });
  }, []);

  /* ================= 소리 ================= */
  useEffect(() => {
    audioRef.current = new Audio("/sounds/sizzles.mp3");
    audioRef.current.loop = true;
  }, []);

  /* ================= 타이머 ================= */
  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const diff = Date.now() - startTime;

      if (diff < 60000) {
        setState("grilling");
      } else if (diff < 90000) {
        setState("perfect");
      } else {
        setState("burn");
      }
    }, 200);

    return () => clearInterval(interval);
  }, [startTime]);

  /* ================= 고기 클릭 ================= */
  const handleMeatClick = () => {
    if (!startTime) {
      setStartTime(Date.now());
      audioRef.current?.play().catch(() => {});
    }

    setFlipped((v) => !v);
  };

  /* ================= 전송 ================= */
  const sendMessage = async () => {
    if (!input.trim()) return;

    if (state !== "perfect") {
      alert("🔥 완벽 타이밍일 때만 전송 가능");
      return;
    }

    await addDoc(collection(db, "meat_chat"), {
      from: me,
      content: input,
      createdAt: serverTimestamp(),
    });

    setInput("");
  };

  /* ================= 다시 시작 ================= */
  const resetGame = () => {
    setStartTime(null);
    setState("raw");
    setFlipped(false);

    audioRef.current?.pause();
    audioRef.current!.currentTime = 0;
  };

  /* ================= 고기 표시 ================= */
  const getMeat = () => {
    if (state === "raw") return "🥩";
    if (state === "grilling") return flipped ? "🥩" : "🥩";
    if (state === "perfect") return flipped? "🍖":"🍖";
    return "🔥";
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">

      {/* ================= 고기 영역 ================= */}
      <div className="flex-1 flex flex-col items-center justify-center">

        {/* 고기 */}
        <div
          onClick={handleMeatClick}
          className={`text-[140px] cursor-pointer transition-transform duration-500 ${
            flipped ? "rotate-180" : ""
          }`}
        >
          {getMeat()}
        </div>

        {/* 상태 텍스트 */}
        <div className="mt-4 text-center font-semibold text-gray-700">
          {state === "raw" && "🥩 고기 올림"}
          {state === "grilling" && "🔥 굽는 중 (60초 이상)"}
          {state === "perfect" && "🍖 완벽 타이밍! 전송 가능"}
          {state === "burn" && "🔥 탔다..."}
        </div>

        {/* 다시 시작 버튼 */}
        {state === "burn" && (
          <button
            onClick={resetGame}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl font-bold"
          >
            🔄 다시 굽기
          </button>
        )}

      </div>

      {/* ================= 입력 ================= */}
      <div className="border-t bg-white p-3 flex gap-2 items-center">

        <input
          className="flex-1 border rounded px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지 입력"
        />

        <button
          onClick={sendMessage}
          className={`px-4 py-2 rounded text-white ${
            state === "perfect" ? "bg-red-500" : "bg-gray-400"
          }`}
        >
          전송
        </button>

      </div>

      {/* ================= 채팅 로그 ================= */}
      <div className="h-52 overflow-y-auto bg-white border-t p-2 text-sm">
        {messages.map((m) => (
          <div key={m.id}>
            <b>{m.from}</b> : {m.content}
          </div>
        ))}
      </div>

    </div>
  );
}