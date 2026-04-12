"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Page() {
  const router = useRouter();

  const userId = "user_123";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [userWinCount, setUserWinCount] = useState(0);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, messages: [] }),
        });
        const data = await res.json();
        setMessages(data.messages || []);
        setUserWinCount(data.userWinCount || 0);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();
  }, [userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, messages: newMessages }),
      });

      const data = await res.json();

      setMessages([
        ...newMessages,
        { role: "assistant", content: data.text },
      ]);

      setUserWinCount(data.userWinCount);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen p-4 bg-gray-100">

      <div className="flex-1 flex flex-col p-2 space-y-2 bg-white rounded-lg">

        {/* 상단 헤더 (뒤로가기 추가) */}
        <div className="flex items-center mb-2 font-medium text-gray-700">
          <button
            onClick={() => router.back()}
            className="mr-2 text-xl font-bold"
          >
            ←
          </button>
          <span>이효린</span>
        </div>

        {/* 채팅 영역 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50 rounded-lg">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`px-3 py-2 max-w-xs rounded-lg break-words 
                ${
                  m.role === "user"
                    ? "bg-blue-400 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          <div ref={chatEndRef} />
        </div>

        {/* 입력 */}
        <div className="flex mt-2">
          <input
            className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="야, 오늘 뭐 했어?"
            disabled={loading}
          />

          <button
            onClick={sendMessage}
            className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? "..." : "전송"}
          </button>
        </div>

      </div>
    </div>
  );
}