// pages/korean.tsx
"use client";

import React, { useState, useEffect } from "react";
import PageContainer from "@/components/PageContainer";
import LeftMenu from "@/components/leftMenu";
import { CenterSpinner } from "@/components/CenterSpinner";
import CommentBox from "@/components/CommentBox";
import { useRouter } from "next/navigation";

// 퀴즈 타입
interface QuizQuestion {
  question: string;
  answer: string;
}

// 원본 퀴즈
const quizQuestions: QuizQuestion[] = [
  { question: "ambition", answer: "야망, 큰 목표" },
  { question: "determination", answer: "결심, 단호함" },
  { question: "opportunity", answer: "기회, 가능성" },
  { question: "wisdom", answer: "지혜, 현명함" },
  { question: "negotiation", answer: "협상, 교섭" },
  { question: "achievement", answer: "성취, 업적" },
  { question: "innovation", answer: "혁신, 새로움" },
  { question: "consequence", answer: "결과, 영향" },
  { question: "honesty", answer: "정직, 솔직함" },
  { question: "responsibility", answer: "책임, 의무" },
];

// 사전
const dictionary: Record<string, string> = {
  ambition: "야망, 큰 목표",
behavior: "행동, 태도",
consequence: "결과, 영향",
determination: "결심, 단호함",
effort: "노력, 수고",
generation: "세대, 한 시대의 사람들",
heritage: "유산, 전통",
impact: "영향, 충격",
journey: "여행, 긴 여정",
knowledge: "지식, 앎",
language: "언어, 말",
memory: "기억, 추억",
notion: "생각, 개념",
opportunity: "기회, 가능성",
philosophy: "철학, 인생관",
quality: "품질, 자질",
reputation: "평판, 명성",
solution: "해결책, 답",
tradition: "전통, 관습",
value: "가치, 중요성",
ability: "능력, 재능",
benefit: "이익, 혜택",
confidence: "자신감, 확신",
decision: "결정, 판단",
education: "교육, 학문",
freedom: "자유, 해방",
growth: "성장, 발달",
honesty: "정직, 솔직함",
intention: "의도, 목적",
justice: "정의, 공정함",
leadership: "지도력, 통솔력",
motivation: "동기, 자극",
negotiation: "협상, 교섭",
obstacle: "장애물, 방해물",
patience: "인내, 참을성",
relationship: "관계, 연관성",
significance: "중요성, 의미",
theory: "이론, 학설",
understanding: "이해, 파악",
victory: "승리, 성공",
wisdom: "지혜, 현명함",
achievement: "성취, 업적",
challenge: "도전, 난관",
creativity: "창의력, 독창성",
discovery: "발견, 탐구",
experience: "경험, 체험",
failure: "실패, 좌절",
innovation: "혁신, 새로움",
possibility: "가능성, 잠재력",
responsibility: "책임, 의무"
};

const EnglishPage: React.FC = () => {
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
            <h1 className="text-5xl text-orange-400 dark:text-white">English</h1>
            <button
              onClick={() => router.push("/study")}
              className="text-orange-600 dark:text-white hover:underline text-lg"
            >
              « back
            </button>
          </div>

          <p className="text-2xl text-orange-900 dark:text-white mb-8">
          English is the basic foreign language.
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
            <h3 className="text-xl font-semibold text-orange-400 mb-3">📝 단어 퀴즈</h3>
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
            <h3 className="text-xl font-semibold text-orange-400 mb-3">📒 시험 결과</h3>
            <p>퀴즈 정답 수: {correctCount} / {randomQuestions.length}</p>
            <p>학습 시간: {correctCount * 4}초 </p>
            <p>푼 문제 수: {quizIndex > randomQuestions.length ? randomQuestions.length : quizIndex}</p>
          </div>

       
              <CommentBox />
            </div>
          </div>
    </PageContainer>
  );
};

export default EnglishPage;
