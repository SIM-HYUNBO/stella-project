"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AISettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setEnabled(localStorage.getItem("ai_summary") === "true");
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem("ai_summary", String(next));
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">

      {/* 🔙 헤더 */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => router.back()}
          className="text-xl"
        >
          ←
        </button>

        <div className="text-xl font-bold">
          🧠 AI 요약
        </div>
      </div>

      {/* 설명 */}
      <div className="text-gray-600 mb-6 leading-relaxed">
        채팅을 자동으로 요약해주는 기능입니다.<br />
        요약된 내용은 채팅방 상단에 표시되고,<br />
        요약 버튼은 전송 버튼 옆에 위치합니다.
      </div>

      {/* 토글 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow">
        <div className="text-lg font-medium">
          AI 요약 사용
        </div>

        <button
          onClick={toggle}
          className={`w-14 h-8 flex items-center rounded-full p-1 transition ${
            enabled ? "bg-blue-500" : "bg-gray-300"
          }`}
        >
          <div
            className={`w-6 h-6 bg-white rounded-full shadow transform transition ${
              enabled ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* 상태 표시 */}
      <div className="mt-4 text-sm text-gray-500">
        현재 상태: {enabled ? "ON (활성화)" : "OFF (비활성화)"}
      </div>

    </div>
  );
}