"use client";
import { useState, useEffect, useRef } from "react";

export default function LiveSTTUpgraded() {
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

    recognition.onend = () => {
      // iOS Safari 자동 중지 방지
      if (listening) recognition.start();
    };

    recognitionRef.current = recognition;
  }, [listening]);

  const startListening = () => {
    if (listening) return;
    recognitionRef.current?.start();
    setListening(true);
  };

  const stopListening = () => {
    if (!listening) return;
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-100 to-gray-50 p-4">
      {/* 설명 텍스트 */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
        <p className="text-gray-700 text-base">
          🎙️ 아래 제목을 입력하고 '시작' 버튼을 누르면, 내 목소리가 실시간으로 텍스트로 변환됩니다.
        </p>
        <p className="text-gray-500 text-sm mt-1">
          '중지' 버튼을 누르면 받아쓰기가 멈춥니다. 모바일에서도 최적화되어 있습니다.
        </p>
      </div>

      {/* 제목 입력 */}
      <input
        type="text"
        placeholder="제목을 입력하세요"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-4 p-3 text-lg border rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {/* 상태 표시 */}
      <div className="flex items-center mb-4">
        <div
          className={`w-4 h-4 rounded-full mr-2 ${
            listening ? "bg-red-500 animate-pulse" : "bg-gray-400"
          }`}
        />
        <span className="text-gray-700 font-medium">
          {listening ? "듣는 중..." : "일시정지"}
        </span>
      </div>

      {/* 받아쓰기 텍스트 */}
      <div className="flex-1 overflow-y-auto p-4 bg-white rounded-xl shadow-md border border-gray-200 text-lg mb-4">
        {text || "말씀하신 내용이 여기에 표시됩니다."}
      </div>

      {/* 버튼 */}
      <div className="flex justify-around">
        <button
          onClick={startListening}
          className="flex-1 mx-2 bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg font-semibold hover:bg-green-600 transition"
        >
          ▶ 시작
        </button>
        <button
          onClick={stopListening}
          className="flex-1 mx-2 bg-red-500 text-white px-6 py-4 rounded-xl shadow-lg font-semibold hover:bg-red-600 transition"
        >
          ⏹ 중지
        </button>
      </div>
    </div>
  );
}