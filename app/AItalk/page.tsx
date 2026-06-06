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
      setMessages([...newMessages, { role: "assistant", content: data.text }]);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <main className="relative h-screen overflow-hidden flex flex-col">
      <div className="fixed inset-0 bg-gray-50" />

      {/* 헤더 */}
      <div className="relative z-10 flex items-center h-14 px-4 bg-white border-b-2 border-gray-700 shrink-0">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-50 text-sky-500 font-bold text-lg mr-3">←</button>
        <div className="w-9 h-9 rounded-full bg-violet-500 flex items-center justify-center text-lg mr-2 shadow-sm">🧠</div>
        <div>
          <p className="font-black text-[gray-800] text-sm leading-tight">이효린</p>
          <p className="text-[10px] text-green-500 font-semibold">온라인</p>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-sm shrink-0 shadow-sm">🧠</div>
            )}
            <div className={`px-4 py-2.5 rounded-[18px] max-w-[72%] text-sm leading-relaxed shadow-sm ${
              m.role === "user"
                ? "bg-sky-500 text-white rounded-br-[6px]"
                : "bg-white border-2 border-gray-700 text-[gray-800] rounded-bl-[6px]"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-sm shrink-0 shadow-sm">🧠</div>
            <div className="px-4 py-3 rounded-[18px] rounded-bl-[6px] bg-white border-2 border-gray-700 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 입력 */}
      <div className="relative z-10 flex items-center gap-2 px-4 py-3 bg-white border-t-2 border-gray-700 shrink-0">
        <input
          className="flex-1 bg-gray-50 border-2 border-gray-700 rounded-[16px] px-4 py-2.5 text-sm text-[gray-800] placeholder:text-[sky-400] outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="야, 오늘 뭐 했어?"
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading}
          className="w-11 h-11 rounded-[14px] bg-sky-500 text-white font-black text-sm shadow-[0_4px_14px_rgba(14,165,233,0.35)] active:scale-95 transition-transform flex items-center justify-center">
          {loading ? "·" : "▶"}
        </button>
      </div>
    </main>
  );
}
