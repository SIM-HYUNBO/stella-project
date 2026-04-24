"use client";

import { useRouter } from "next/navigation";

export default function FriendSettingsMenu() {
  const router = useRouter();

  return (
    <div className="p-4 flex flex-col gap-4">

      {/* ================= 헤더 ================= */}
      <div className="flex items-center gap-3 mb-2">

        {/* 뒤로가기 버튼 */}
        <button
          onClick={() => router.back()}
          className="text-xl font-bold px-2"
        >
          ←
        </button>

        {/* 타이틀 */}
        <h1 className="text-lg font-bold">친구 설정</h1>
      </div>

      {/* ================= 메뉴 ================= */}
      <button
        onClick={() => router.push("/friends/blocked")}
        className="flex justify-between items-center p-4 bg-white rounded shadow"
      >
        <span>차단 친구</span>
        <span className="text-gray-400">{">"}</span>
      </button>

      
    </div>
  );
}