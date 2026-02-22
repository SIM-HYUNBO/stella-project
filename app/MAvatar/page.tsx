"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

export default function App() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [emoji, setEmoji] = useState("");

  // 채팅 전송
  const sendMessage = () => {
    if (!input) return;
    setMessages((prev) => [...prev, input]);
    setInput("");
  };

  // 이모지 2초 애니메이션
  useEffect(() => {
    if (!emoji) return;
    const timer = setTimeout(() => setEmoji(""), 2000);
    return () => clearTimeout(timer);
  }, [emoji]);

  return (
    <div className="relative w-screen h-screen bg-gray-900 text-white overflow-hidden">
      
      {/* 라이브 영상 */}
      <div className="w-full h-[40vh] bg-black">
        <ReactPlayer
          url="https://www.youtube.com/watch?v=5qap5aO4i9A" // 여기에 HLS 또는 YouTube Live URL
          playing
          controls
          width="100%"
          height="100%"
        />
      </div>

      {/* 관객 이모지 효과 */}
      {emoji && (
        <div
          className="absolute top-[20%] left-1/2 text-4xl animate-bounce"
          style={{ transform: "translateX(-50%)" }}
        >
          {emoji}
        </div>
      )}

      {/* 채팅창 */}
      <div className="absolute bottom-20 left-4 w-[90%] max-h-[40%] overflow-y-auto bg-black/50 p-2 rounded">
        <div>
          {messages.map((m, i) => (
            <div key={i}>{m}</div>
          ))}
        </div>
        <div className="flex mt-2">
          <input
            className="flex-1 p-1 rounded border-none text-black"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지 입력"
          />
          <button
            onClick={sendMessage}
            className="ml-2 p-1 bg-blue-500 rounded text-white"
          >
            전송
          </button>
        </div>

        {/* 이모지 버튼 */}
        <div className="flex mt-2 space-x-2">
          {["👏", "❤️", "🔥"].map((e) => (
            <button key={e} className="text-2xl" onClick={() => setEmoji(e)}>
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}