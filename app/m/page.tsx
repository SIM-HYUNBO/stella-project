"use client";
import { useEffect, useState } from "react";
import PageContainer from "@/components/PageContainer";
import { useTheme } from "next-themes";
import {CenterSpinner} from "@/components/CenterSpinner";
import CommentBox from "@/components/CommentBox";
import { useRouter } from "next/navigation";

export default function Math() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setCurrentTheme(theme);
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // 10문제 퀴즈 데이터
  const quizList = [
    { q: "다음 중 소수(Prime Number)는?", options: [9, 11, 15, 21], a: 11 },
    { q: "3 × 7 = ?", options: [20, 21, 22, 24], a: 21 },
    { q: "25의 제곱근은?", options: [4, 5, 6, 7], a: 5 },
    { q: "π(파이)는 약 얼마인가?", options: [2.12, 3.14, 3.41, 4.13], a: 3.14 },
    { q: "1 + 2 + 3 + ... + 10 = ?", options: [40, 45, 50, 55], a: 55 },
    { q: "삼각형의 내각의 합은?", options: [90, 120, 180, 270], a: 180 },
    { q: "√64 = ?", options: [8, 9, 10, 11], a: 8 },
    { q: "10 ÷ 2 × 3 = ?", options: [10, 15, 20, 30], a: 15 },
    { q: "5! (팩토리얼)은?", options: [60, 100, 120, 240], a: 120 },
    { q: "원의 반지름이 2일 때 넓이는? (π=3.14)", options: [6.28, 9.42, 12.56, 18.84], a: 12.56 },
  ];

  const quiz = quizList[currentIndex];

  const handleAnswer = (option) => {
    if (selected !== null) return; // 중복 클릭 방지
    setSelected(option);
    const correct = option === quiz.a;
    setIsCorrect(correct);
    if (correct) setScore((s) => s + 1);

    // 1초 후 다음 문제로 이동
    setTimeout(() => {
      if (currentIndex < quizList.length - 1) {
        setCurrentIndex((i) => i + 1);
        setSelected(null);
        setIsCorrect(null);
      } else {
        setFinished(true);
      }
    }, 1000);
  };

  if (loading) return <CenterSpinner />;

  return (
    <PageContainer>
      <div className="flex w-full h-screen">

        <div className="flex-1 flex flex-col p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-5xl text-orange-400 dark:text-white">Math</h1>
            <button
              onClick={() => router.push("/study")}
              className="text-orange-600 dark:text-text-white hover:underline text-lg"
            >
              « back
            </button>
          </div>

          <h2 className="text-2xl text-orange-900 dark:text-white mb-6">
            Math is a language.
          </h2>

          {/* 그래프 애니메이션 */}
          <div className="flex items-end gap-2 h-40 mt-10">
            {[30, 80, 55, 100, 65, 40, 90].map((h, i) => (
              <div
                key={i}
                className="w-6 bg-orange-400 rounded-t-md animate-pulse"
                style={{
                  height: `${h}px`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: "1.5s",
                }}
              ></div>
            ))}
          </div>

          <p className="text-lg text-orange-900 dark:text-white mt-10 max-w-2xl">
            Mathematics helps you see the invisible — the patterns, logic, and
            rhythm that shape the world. Keep exploring!
          </p>

          {/* 🧠 퀴즈 영역 */}
          <div className="mt-12 p-6 rounded-2xl shadow-md bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm max-w-md">
            {!finished ? (
              <>
                <h3 className="text-xl font-semibold text-orange-500 mb-4">
                  🧠 Quiz {currentIndex + 1} / {quizList.length}
                </h3>
                <p className="text-gray-800 dark:text-gray-200 mb-6">
                  {quiz.q}
                </p>

                <div className="flex flex-col gap-3">
                  {quiz.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(opt)}
                      disabled={selected !== null}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selected === opt
                          ? isCorrect
                            ? "bg-green-400/70 border-green-500 text-white"
                            : "bg-red-400/70 border-red-500 text-white"
                          : "bg-gray-100 dark:bg-gray-700 hover:bg-orange-100"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center">
                <h3 className="text-2xl font-bold text-orange-500 mb-4">
                  🎉 퀴즈 완료!
                </h3>
                <p className="text-lg text-gray-800 dark:text-gray-200 mb-6">
                  당신의 점수는 <strong>{score}</strong> / {quizList.length} 입니다.
                </p>
                <button
                  onClick={() => {
                    setFinished(false);
                    setCurrentIndex(0);
                    setScore(0);
                    setSelected(null);
                    setIsCorrect(null);
                  }}
                  className="px-6 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600"
                >
                  다시 풀기 🔁
                </button>
              </div>
            )}
          </div>
          <CommentBox />
        </div>
      </div>
    </PageContainer>
  );
}
