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
          onClick={() => router.push("/")}
          className="px-5 py-2.5 bg-transparent text-white rounded-lg transition-all"
        >
          🏠
        </button>
      </div>

      {/* 본문 */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <p className="text-lg text-gray-700 dark:text-gray-200">
       새해 복 많이 받왁!
         <br />
         기간:1월 1일~ 2월 17일
         <br />
         왁! 새해 복 많이 받으세요 여러분~
         <br />
         새해라는 주제로 예쁜 그림을 그려 올려주세요!
         <br />
         가장 마음에 드는 글에는 좋아요 꾸욱!
         <br />
         좋아요를 가장 많이 받은 글은 홈 화면에 상패와 함께 공개됩니다!
        <br />
         이벤트에 참석하고 싶으시다고요? 아래 버튼 클릭!
        <br /> 
          -홈페이지에 대해 불편한 시설이 있다면 댓글로 남겨주세요!
        </p>
        <button
          onClick={() => router.push("/event")}
          className="px-5 py-2.5 mt-10 bg-orange-400 text-white rounded-lg transition-all"
        >
          이벤트 참여하기
        </button>
      </div>
    </div>
  );
}
