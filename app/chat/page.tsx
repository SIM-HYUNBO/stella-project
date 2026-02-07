"use client";
import React, { useState, useRef, useEffect } from "react";

type Sender = "user" | "ai";
type Message = { text: string; sender: Sender };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { text: input, sender: "user" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input })
      });
      const data = await res.json();
      const aiText: string = data.answer;

      // 타이핑 애니메이션
      let index = 0;
      const aiMsg: Message = { text: "", sender: "ai" };
      setMessages(prev => [...prev, aiMsg]);

      const interval = setInterval(() => {
        index++;
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].text = aiText.slice(0, index);
          return newMsgs;
        });
        if (index >= aiText.length) clearInterval(interval);
      }, 40);
    } catch (err) {
      const aiMsg: Message = { text: "오류가 발생했어 😢", sender: "ai" };
      setMessages(prev => [...prev, aiMsg]);
      console.error(err);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 font-[주아]">
      <div className="p-4 text-center font-bold text-3xl text-gray-800">심심풀이 AI</div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[70%] p-3 rounded-xl shadow ${
              msg.sender === "user"
                ? "bg-blue-500 text-white self-end rounded-br-none"
                : "bg-white text-gray-800 self-start rounded-bl-none"
            }`}
          >
            {msg.text}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-white flex gap-2 shadow-inner">
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="AI에게 물어봐~"
        />
        <button
          className="bg-indigo-500 text-white px-6 py-2 rounded-full hover:bg-indigo-600 transition"
          onClick={sendMessage}
        >
          전송
        </button>
      </div>
    </div>
  );
}
