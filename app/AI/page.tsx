"use client";

import React, { useState } from "react";

const chatPrompt = `
너는 심심풀이 대화 AI야.
규칙:
1. 항상 반말
2. 유머러스하게 답변
3. 질문에 짧고 재치있게 대답
4. 필요하면 예시나 비유를 들어서 설명
5. 대화가 끊기면 관심을 끌만한 질문으로 이어가기
6. 금지: 공격적이거나 불쾌한 내용
`;

interface Message {
  text: string;
  sender: "user" | "ai";
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      const aiMessage: Message = { text: data.answer, sender: "ai" };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (e) {
      setMessages((prev) => [...prev, { text: "에러났어 ㅠㅠ", sender: "ai" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen p-4 bg-gray-100">
      <div className="flex-1 overflow-y-auto mb-4 space-y-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 rounded max-w-xs ${
              msg.sender === "user" ? "bg-blue-500 text-white ml-auto" : "bg-gray-300 text-black"
            }`}
          >
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="p-2 rounded max-w-xs bg-gray-300 text-black animate-pulse">
            AI 생각중...
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 p-2 rounded border border-gray-300"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="심심할 때 물어봐~"
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={sendMessage}
        >
          전송
        </button>
      </div>
    </div>
  );
}
