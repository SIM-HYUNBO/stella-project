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
          홈페이지 설명...
          <br />
          -홈페이지의 홈 화면에서 게시판 가기 버튼을 누르면 이곳으로 이동됩니다.
          <br />
          -커뮤니케이션에는 자유롭게 댓글이나 지식을 남길 수 있습니다. 달린
          댓글은 다른 페이지에도 항상 보입니다.
          <br />
          -테스트나 문제, 시험을 보는 곳은 Study에 있습니다. 각 과목에 대한
          문제를 풀고 결과를 확인할 수 있습니다.
          <br />
          -그 외 다른 페이지에서는 동영상을 볼 수 있고, 노트도 이용할 수
          있습니다.
          <br />
          -국어, 영어 과목 페이지에 있는 단어 검색창은 시험용으로만 쓰는 것을
          추천드립니다.
          <br />
          -홈페이지에 대해 불편한 시설이 있다면 댓글로 남겨주세요!
        </p>
      </div>
      <CommentBox />
    </div>
  );
}
