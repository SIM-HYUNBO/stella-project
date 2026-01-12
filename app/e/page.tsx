"use client";

import { useState, useRef } from "react";

export default function RealTimeSing() {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("녹음 실패:", err);
      alert("마이크 권한이 필요합니다.");
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">실시간 노래 녹음</h1>
      <button
        className={`px-6 py-2 rounded text-white ${recording ? "bg-red-500" : "bg-green-500"}`}
        onClick={recording ? handleStopRecording : handleStartRecording}
      >
        {recording ? "녹음 중지" : "녹음 시작"}
      </button>

      {audioURL && (
        <div className="mt-4">
          <h2 className="font-semibold">녹음된 노래</h2>
          <audio src={audioURL} controls className="mt-2 w-full" />
        </div>
      )}
    </div>
  );
}
