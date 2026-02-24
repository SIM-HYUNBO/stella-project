"use client";

import { useRouter } from "next/navigation";
import CommentBox from "/components/CommentBox";
import { CenterSpinner } from "/components/CenterSpinner";

export default function BoardPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-10">
      {/* 제목 + 홈버튼 한 줄 배치 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-orange-400 dark:text-white">
          GENIUS 게시판
        </h1>
        <button
          onClick={() => router.push("/home")}
          className="px-5 py-2.5 bg-transparent text-white rounded-lg transition-all"
        >
          🏠
        </button>
      </div>

      {/* 본문 */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <p className="text-lg text-gray-700 dark:text-gray-200">
          특별 이벤트 없음
         <br />
          홈페이지에 대해 불편한 시설이 있다면 댓글로 남겨주세요!
        </p>
        
      </div>
    </div>
  );
}
