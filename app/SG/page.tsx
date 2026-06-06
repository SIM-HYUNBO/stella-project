"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function LiveSTTWithHeader() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Web Speech API 미지원"); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript + " ";
      }
      setText((prev) => prev + finalText);
    };
    recognitionRef.current = recognition;
  }, []);

  const startListening = () => { if (listening) return; recognitionRef.current?.start(); setListening(true); };
  const stopListening = () => { recognitionRef.current?.stop(); setListening(false); };

  const summarizeMeeting = async () => {
    setLoading(true);
    const res = await fetch("/api/summarize-inline", { method: "POST", body: JSON.stringify({ title, text }) });
    const data = await res.json();
    setSummary(data.summary);
    setLoading(false);
  };

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col">
      <div className="fixed inset-0 bg-gray-50" />

      {/* 헤더 */}
      <div className="relative z-10 flex items-center h-14 px-4 bg-white border-b-2 border-gray-700 shrink-0">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-50 text-sky-500 font-bold text-lg mr-3">←</button>
        <span className="font-black text-[gray-800] text-base">🗣 와글와글 토의방</span>
        {listening && (
          <span className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-500">녹음중</span>
          </span>
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto">
        {/* 제목 입력 */}
        <input
          className="rounded-[20px] bg-white border-2 border-gray-700 px-5 py-3.5 text-sm text-[gray-800] placeholder:text-[sky-400] outline-none font-semibold shadow-sm"
          placeholder="회의 제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* 음성 텍스트 */}
        <div className="flex-1 min-h-[180px] rounded-[20px] bg-white border-2 border-gray-700 px-5 py-4 shadow-sm overflow-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🎤</span>
            <p className="font-black text-[gray-800] text-sm">음성 인식 내용</p>
          </div>
          <p className="text-sm text-[#9d7060] leading-relaxed whitespace-pre-wrap">
            {text || "음성이 여기에 표시됩니다."}
          </p>
        </div>

        {/* AI 요약 */}
        <div className={`rounded-[20px] border px-5 py-4 shadow-sm transition-all ${summary ? "bg-violet-500 border-purple-100" : "bg-white/80 border-sky-100"}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">📌</span>
            <p className="font-black text-[gray-800] text-sm">AI 요약</p>
          </div>
          <p className="text-sm text-[#9d7060] leading-relaxed">
            {loading ? "요약 중..." : summary || "회의가 끝나면 요약 버튼을 눌러주세요."}
          </p>
        </div>

        {/* 버튼들 */}
        <div className="flex gap-3 pb-4">
          <button onClick={startListening} disabled={listening}
            className={`flex-1 h-12 rounded-[16px] font-black text-sm shadow-sm active:scale-[0.98] transition-transform ${listening ? "bg-gray-200 text-gray-400" : "bg-green-500 text-white shadow-[0_4px_14px_rgba(50,200,100,0.3)]"}`}>
            🎤 시작
          </button>
          <button onClick={stopListening} disabled={!listening}
            className={`flex-1 h-12 rounded-[16px] font-black text-sm shadow-sm active:scale-[0.98] transition-transform ${!listening ? "bg-gray-200 text-gray-400" : "bg-red-500 text-white shadow-[0_4px_14px_rgba(255,80,80,0.3)]"}`}>
            ⏹ 중지
          </button>
          <button onClick={summarizeMeeting} disabled={loading || !text}
            className={`flex-1 h-12 rounded-[16px] font-black text-sm shadow-sm active:scale-[0.98] transition-transform ${!text || loading ? "bg-gray-200 text-gray-400" : "bg-sky-500 text-white shadow-[0_4px_14px_rgba(14,165,233,0.35)]"}`}>
            ✨ 요약
          </button>
        </div>
      </div>
    </main>
  );
}
