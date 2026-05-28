"use client";

import { useEffect, useRef, useState } from "react";
import { db, auth } from "@/app/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Message = { id: string; from: string; content: string; createdAt?: any; };

export default function MeatChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [nickname, setNickname] = useState<string>("guest");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [state, setState] = useState<"raw" | "grilling" | "perfect" | "burn">("raw");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setNickname(user?.displayName || "guest");
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "meat_chat"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
  }, []);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/sizzles.mp3");
    audioRef.current.loop = true;
  }, []);

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      const diff = Date.now() - startTime;
      if (diff < 60000) setState("grilling");
      else if (diff < 90000) setState("perfect");
      else setState("burn");
    }, 200);
    return () => clearInterval(interval);
  }, [startTime]);

  const handleMeatClick = () => {
    if (!startTime) {
      setStartTime(Date.now());
      audioRef.current?.play().catch(() => {});
    }
    setFlipped((v) => !v);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (state !== "perfect") { alert("🔥 완벽 타이밍일 때만 전송 가능"); return; }
    await addDoc(collection(db, "meat_chat"), { from: nickname, content: input, createdAt: serverTimestamp() });
    setInput("");
  };

  const resetGame = () => {
    setStartTime(null);
    setState("raw");
    setFlipped(false);
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const getMeat = () => {
    if (state === "raw") return "🥩";
    if (state === "grilling") return flipped ? "🥩" : "🥩";
    if (state === "perfect") return "🍖";
    return "🔥";
  };

  const stateColors: Record<string, string> = {
    raw: "text-[#c09070]", grilling: "text-orange-500", perfect: "text-green-500", burn: "text-red-500",
  };

  return (
    <main className="relative h-screen overflow-hidden flex flex-col">
      <div className="fixed inset-0 bg-gray-50" />

      {/* 고기 영역 */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4">
        <div className="rounded-[28px] bg-white border border-gray-100 px-10 py-8 shadow-[0_8px_30px_rgba(255,150,80,0.15)] flex flex-col items-center gap-4">
          <p className="font-black text-[#3d1f00] text-lg">🥩 고기 굽기</p>

          <div
            onClick={handleMeatClick}
            className={`text-[120px] cursor-pointer transition-all duration-500 select-none ${flipped ? "scale-x-[-1]" : ""}`}
            style={{ filter: state === "burn" ? "grayscale(0.5) brightness(0.7)" : state === "perfect" ? "drop-shadow(0 0 12px rgba(255,160,50,0.6))" : "none" }}
          >
            {getMeat()}
          </div>

          <p className={`font-black text-sm ${stateColors[state]}`}>
            {state === "raw" && "🥩 올려서 굽기 시작"}
            {state === "grilling" && "🔥 굽는 중... (60초 이상 기다려)"}
            {state === "perfect" && "🍖 완벽 타이밍! 지금 전송 가능 ✓"}
            {state === "burn" && "💀 탔다... 다시 구워야 해"}
          </p>

          {state === "burn" && (
            <button onClick={resetGame}
              className="px-6 py-3 rounded-[16px] bg-gradient-to-r from-red-400 to-orange-400 text-white font-black text-sm shadow-md active:scale-95 transition-transform">
              🔄 다시 굽기
            </button>
          )}

          <p className="text-[10px] text-[#c09070] font-semibold">{nickname}</p>
        </div>
      </div>

      {/* 채팅 로그 */}
      <div className="relative z-10 h-44 overflow-y-auto bg-white border-t border-gray-100 px-4 py-3 space-y-1">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-black text-orange-500">{m.from}</span>
            <span className="text-[#3d1f00]"> : {m.content}</span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* 입력 */}
      <div className="relative z-10 flex items-center gap-2 px-4 py-3 bg-white border-t border-gray-100 shrink-0">
        <input
          className="flex-1 bg-gray-50 border border-gray-100 rounded-[16px] px-4 py-2.5 text-sm text-[#3d1f00] placeholder:text-[#d4a07a] outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={state === "perfect" ? "완벽! 지금 전송하세요 🍖" : "고기가 완벽해질 때까지 기다려..."}
        />
        <button onClick={sendMessage}
          className={`w-11 h-11 rounded-[14px] text-white font-black shadow-md active:scale-95 transition-transform flex items-center justify-center ${
            state === "perfect" ? "bg-gradient-to-r from-orange-400 to-amber-300 shadow-[0_4px_14px_rgba(255,160,50,0.35)]" : "bg-gray-300"
          }`}>
          ▶
        </button>
      </div>
    </main>
  );
}
