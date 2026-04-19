"use client";

import { useEffect, useState } from "react";

export default function AISettingsPage() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(localStorage.getItem("ai_summary") === "true");
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem("ai_summary", String(next));
  };

  return (
    <div className="p-6">

      <div className="text-xl font-bold mb-4">
        🧠 AI 요약 설정
      </div>

      <div
        onClick={toggle}
        className={`p-4 rounded-xl cursor-pointer w-fit ${
          enabled
            ? "bg-green-500 text-white"
            : "bg-gray-200"
        }`}
      >
        AI 요약 {enabled ? "ON" : "OFF"}
      </div>

    </div>
  );
}