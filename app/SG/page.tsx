"use client";

import { useState, useEffect, useRef } from "react";

export default function LiveSTTWithHeader() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Web Speech API 미지원");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + " ";
        }
      }

      setText((prev) => prev + finalText);
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    if (listening) return;
    recognitionRef.current?.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // ⭐ Server Action 호출
  const summarizeMeeting = async () => {
    setLoading(true);

    const res = await fetch("/api/summarize-inline", {
      method: "POST",
      body: JSON.stringify({ title, text }),
    });

    const data = await res.json();
    setSummary(data.summary);
    setLoading(false);
  };

  return (
    <div className="p-4 flex flex-col h-screen">
      <h1 className="text-2xl font-bold mb-3">🗣 와글와글 토의방</h1>

      <input
        className="border p-2 mb-3 rounded"
        placeholder="회의 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="flex-1 border rounded p-3 overflow-auto">
        {text || "음성이 여기에 표시됩니다."}
      </div>

      <div className="mt-3 border rounded p-3 bg-blue-50">
        <b>📌 AI 요약</b>
        <p className="mt-2">
          {loading ? "요약 중..." : summary || "요약 결과"}
        </p>
      </div>

      <div className="flex gap-3 mt-3">
        <button onClick={startListening} className="bg-green-500 text-white px-4 py-2 rounded">
          시작
        </button>

        <button onClick={stopListening} className="bg-red-500 text-white px-4 py-2 rounded">
          중지
        </button>

        <button onClick={summarizeMeeting} className="bg-blue-500 text-white px-4 py-2 rounded">
          회의 요약
        </button>
      </div>
    </div>
  );
}