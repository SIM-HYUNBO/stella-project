// pages/korean.tsx
"use client";

import React, { useState, useEffect } from "react";
import PageContainer from "@/components/PageContainer";
import LeftMenu from "@/components/leftMenu";
import { CenterSpinner } from "@/components/CenterSpinner";
import { useRouter } from "next/navigation";

// 퀴즈 타입
interface QuizQuestion {
  question: string;
  answer: string;
}

// 원본 퀴즈
const quizQuestions: QuizQuestion[] = [
  { question: "‘학교’의 뜻은?", answer: "학생들이 배우는 장소" },
  { question: "‘국어’는 어떤 과목?", answer: "우리말과 문법을 배우는 과목" },
  { question: "‘컴퓨터’는 무엇인가?", answer: "정보를 처리하는 기계" },
  { question: "‘책’은 무엇인가?", answer: "지식을 담은 인쇄물" },
  { question: "‘사랑’은 무엇인가?", answer: "사람이나 다른 존재를 아끼고 좋아하는 마음" },
];

// 사전
const dictionary: Record<string, string> = {
  학교: "학생들이 배우는 장소",
  공부: "지식을 배우거나 익히는 활동",
  수학: "숫자와 도형을 다루는 학문",
  국어: "우리말과 문법을 배우는 과목",
  가방: "물건을 넣어 가지고 다니는 용기",
  사랑: "사람이나 다른 존재를 아끼고 좋아하는 마음",
  시간: "과거에서 미래로 흘러가는 존재의 연속",
  책: "지식을 담은 인쇄물",
  컴퓨터: "정보를 처리하는 기계",
  음악: "소리와 리듬을 이용한 예술",
  친구: "서로 친밀하게 사귀는 사람",
  노트: "글을 적는 공책",
  게임: "즐기기 위한 활동이나 놀이",
  바람: "공기나 기체가 이동하는 현상",
  물: "생명체가 필요로 하는 액체",
  하늘: "지구 위에 있는 푸른 공간",
  태양: "우리 태양계의 중심 별",
  달: "밤하늘에 보이는 지구의 위성",
  연필: "글씨를 쓰거나 그림을 그리는 도구",
};

const KoreanPage: React.FC = () => {
  const router = useRouter();

  // 상태
  const [word, setWord] = useState<string>("");
  const [meaning, setMeaning] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [randomQuestions, setRandomQuestions] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizAnswer, setQuizAnswer] = useState<string>("");
  const [quizFeedback, setQuizFeedback] = useState<string>("");
  const [correctCount, setCorrectCount] = useState<number>(0);

  const [discussionText, setDiscussionText] = useState<string>("");
  const [discussionList, setDiscussionList] = useState<string[]>([]);

  // 페이지 로드 시 퀴즈 랜덤화
  useEffect(() => {
    setRandomQuestions([...quizQuestions].sort(() => Math.random() - 0.5));
  }, []);

  // 단어 검색
  const handleSearch = () => {
    if (!word.trim()) return;
    setLoading(true);
    setMeaning("");

    setTimeout(() => {
      if (dictionary.hasOwnProperty(word)) {
        setMeaning(dictionary[word]);
      } else {
        setMeaning("뜻을 찾을 수 없습니다.");
      }
      setLoading(false);
    }, 500);
  };

  // 퀴즈 제출
  const handleQuizSubmit = () => {
    if (!quizAnswer.trim()) return;

    const correct = randomQuestions[quizIndex].answer;

    if (quizAnswer.trim() === correct) {
      setQuizFeedback("✅ 정답입니다!");
      setCorrectCount((prev) => prev + 1);
    } else {
      setQuizFeedback(`❌ 틀렸습니다. 정답: ${correct}`);
    }

    setQuizAnswer("");

    if (quizIndex < randomQuestions.length - 1) {
      setQuizIndex((prev) => prev + 1);
    } else {
      setQuizIndex(randomQuestions.length); // 퀴즈 종료 처리
      setQuizFeedback(`🎉 퀴즈 완료! 총 ${correctCount + 1}/${randomQuestions.length} 정답`);
    }
  };

  // 토론 등록
  const handleDiscussionSubmit = () => {
    if (!discussionText.trim()) return;
    setDiscussionList((prev) => [...prev, discussionText]);
    setDiscussionText("");
  };

  return (
    <PageContainer>
      <div className="flex w-full h-screen">
        <LeftMenu />
        <div className="flex-1 flex flex-col p-8 overflow-y-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-5xl text-orange-400 dark:text-white">Korean</h1>
            <button
              onClick={() => router.push("/study")}
              className="text-orange-600 dark:text-white hover:underline text-lg"
            >
              « back
            </button>
          </div>

          <p className="text-2xl text-orange-900 dark:text-white mb-8">
            Good language skills are essential for academic success.
          </p>

          {/* 단어 검색 */}
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="검색할 단어를 입력하세요..."
              className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-white"
            />
            <button
              onClick={handleSearch}
              className="px-5 py-2.5 text-white rounded-lg bg-orange-500 hover:bg-orange-600 transition-all"
            >
              🔍
            </button>
          </div>

          {loading && (
            <div className="flex justify-center items-center mt-10">
              <CenterSpinner />
            </div>
          )}

          {!loading && meaning && (
            <div className="p-6 bg-white/70 dark:bg-gray-800/70 rounded-2xl shadow-md max-w-2xl mb-6">
              <h3 className="text-xl font-semibold text-orange-400 mb-3">
                🔍 “{word}”의 뜻
              </h3>
              <p className="text-orange-900 dark:text-white text-lg">{meaning}</p>
            </div>
          )}

          {/* 퀴즈 */}
          <div className="p-6 bg-white/70 dark:bg-gray-800/70 rounded-2xl shadow-md max-w-2xl mb-6">
            <h3 className="text-xl font-semibold text-orange-400 mb-3">📝 실시간 퀴즈</h3>
            {quizIndex < randomQuestions.length ? (
              <>
                <p className="mb-3 text-orange-900 dark:text-white font-medium">{randomQuestions[quizIndex].question}</p>
                <input
                  type="text"
                  value={quizAnswer}
                  onChange={(e) => setQuizAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuizSubmit()}
                  className="p-2 rounded border border-gray-300 dark:border-gray-600 w-full mb-2"
                  placeholder="정답을 입력하세요"
                />
                <button
                  onClick={handleQuizSubmit}
                  className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  제출
                </button>
                {quizFeedback && (
                  <p
                    className={`mt-2 font-semibold ${
                      quizFeedback.startsWith("✅")
                        ? "text-green-500 dark:text-white"
                        : "text-red-500 dark:text-white"
                    }`}
                  >
                    {quizFeedback}
                  </p>
                )}
              </>
            ) : (
              <p>🎉 퀴즈를 모두 완료했습니다!</p>
            )}
          </div>

          {/* 성장 그래프 */}
          <div className="p-6 bg-white/70 dark:bg-gray-800/70 rounded-2xl shadow-md max-w-2xl mb-6">
            <h3 className="text-xl font-semibold text-orange-400 mb-3">📈 성장 그래프</h3>
            <p>퀴즈 정답 수: {correctCount} / {randomQuestions.length}</p>
            <p>학습 시간: {correctCount * 4}초</p>
            <p>푼 문제 수: {quizIndex > randomQuestions.length ? randomQuestions.length : quizIndex}</p>
          </div>

          {/* 토론방 */}
          <div className="p-6 bg-white/70 dark:bg-gray-800/70 rounded-2xl shadow-md max-w-2xl mb-6">
            <h3 className="text-xl font-semibold text-orange-400 mb-3">💬 토론방</h3>
            <textarea
              value={discussionText}
              onChange={(e) => setDiscussionText(e.target.value)}
              placeholder="자유롭게 글을 남겨보세요..."
              className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 mb-2"
            />
            <button
              onClick={handleDiscussionSubmit}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 mb-3"
            >
              등록
            </button>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {discussionList.map((d, idx) => (
                <p key={idx} className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                  {d}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default KoreanPage;
