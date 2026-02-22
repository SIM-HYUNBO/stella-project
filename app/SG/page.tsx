"use client";
import { useState, useEffect, useRef } from "react";

export default function LiveSTTWithHeader() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("브라우저가 Web Speech API를 지원하지 않습니다.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interimText = "";
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript + " ";
        else interimText += transcript;
      }
      setText(finalText + interimText);
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
  if (listening) return; // 이미 듣고 있으면 무시
  recognitionRef.current?.start();
  setListening(true);
};

  const stopListening = () => {
  if (!listening) return; // 이미 멈춰있으면 무시
  recognitionRef.current?.stop();
  setListening(false);
};
  return (
    <div className="flex flex-col h-screen p-4 bg-gray-50">
      {/* 설명 텍스트 */}
      <p className="mb-4 text-orange-400 text-2xl font-bold">
        와글와글 토의방
      </p>

      {/* 제목 입력 */}
      <input
        type="text"
        placeholder="제목을 입력하세요"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-4 p-2 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {/* 상태 표시 */}
      <div className="flex items-center mb-4">
        <div
          className={`w-4 h-4 rounded-full mr-2 ${
            listening ? "bg-red-500 animate-pulse" : "bg-gray-400"
          }`}
        />
        <span>{listening ? "듣는 중..." : "일시정지"}</span>
      </div>

      {/* 받아쓰기 텍스트 */}
      <div className="flex-1 overflow-y-auto p-2 bg-white rounded-lg border border-gray-200 text-lg">
        {text || "말씀하신 내용이 여기에 표시됩니다."}
      </div>

      {/* 버튼 */}
      <div className="flex justify-around mt-4">
        <button
          onClick={startListening}
          className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-md"
        >
          ▶ 시작
        </button>
        <button
          onClick={stopListening}
          className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-md"
        >
          ⏹ 중지
        </button>
      </div>
    </div>
  );
}