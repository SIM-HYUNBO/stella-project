"use client";

import { useState, useEffect, useRef } from "react";

export default function Page() {
  const userId = "user_123"; // 여기에 바로 정의
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userWinCount, setUserWinCount] = useState(0);
  const chatEndRef = useRef(null);

  // 기존 FriendChat 코드 그대로
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch("/api/jang", {
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
    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/jang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, messages: newMessages }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.text }]);
      setUserWinCount(data.userWinCount);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">AItalk 페이지</h1>
      <div className="flex-1 flex flex-col p-2 space-y-2 bg-white rounded-lg">
        <div className="mb-2 font-medium text-gray-700">
          AI친구 장난이와 농담 나눔
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50 rounded-lg">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-3 py-2 max-w-xs rounded-lg break-words 
                  ${m.role === "user" ? "bg-blue-400 text-white" : "bg-gray-200 text-gray-800"}`}
              >
                {m.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="flex mt-2">
          <input
            className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="하이루!"
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