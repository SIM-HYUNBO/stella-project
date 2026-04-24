"use client";

import { useRouter } from "next/navigation";

export default function CleanupPage() {
  const router = useRouter();

  return (
    <div className="p-4">

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.back()}>←</button>
        <h1 className="font-bold">친구 정리</h1>
      </div>

      <div className="space-y-3">

        <div className="p-4 bg-white rounded shadow">
          최근 대화 없는 친구
        </div>

        <div className="p-4 bg-white rounded shadow">
          활동 없는 친구
        </div>

        <div className="p-4 bg-white rounded shadow">
          프로필 없는 친구
        </div>

        <div className="p-4 bg-white rounded shadow text-gray-500">
          👉 실제 기능은 추후 구현
        </div>

      </div>

    </div>
  );
}