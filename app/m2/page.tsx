"use client";

import { useEffect, useState } from "react";
import PageContainer from "@/components/PageContainer";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection } from "firebase/firestore";
import { useRouter } from "next/navigation";

/* ===============================
   미니 테스트 데이터 (생략 금지)
================================ */

const miniTests: any = {
  국어: [
    { q: "다음 중 올바른 맞춤법은?", options: ["되여", "되어", "돼여"], a: "되어" },
    { q: "다음 문장에서 주어는?", options: ["철수", "학교", "갔다"], a: "철수" },
    { q: "다음 중 관형사는?", options: ["큰", "크게", "크다"], a: "큰" },
    { q: "다음 중 부사는?", options: ["빨리", "철수", "달린다"], a: "빨리" },
    { q: "다음 중 올바른 띄어쓰기?", options: ["학교에가다", "학교에 가다", "학교 에 가다"], a: "학교에 가다" },
    { q: "다음 중 동사는?", options: ["민수", "달린다", "학교"], a: "달린다" },
    { q: "다음 중 의성어는?", options: ["멍멍", "학교", "사랑"], a: "멍멍" },
    { q: "다음 중 한자어는?", options: ["전화", "밥", "꿈"], a: "전화" },
    { q: "다음 문장에서 목적어는? ‘철수가 사과를 먹었다’", options: ["철수", "사과", "먹었다"], a: "사과" },
    { q: "다음 중 반의어 관계는?", options: ["크다-작다", "크다-크게", "크다-커"], a: "크다-작다" },
    { q: "다음 중 접속사는?", options: ["그리고", "학교", "달린다"], a: "그리고" },
  ],
  영어: [
    { q: "baby의 복수형은?", options: ["babys", "babies", "babyes"], a: "babies" },
    { q: "go의 과거형은?", options: ["goed", "went", "gone"], a: "went" },
    { q: "___ apple (알맞은 관사)", options: ["a", "an", "the"], a: "an" },
    { q: "He ___ a book.", options: ["read", "reads", "reading"], a: "reads" },
    { q: "happy의 동의어는?", options: ["sad", "joyful", "angry"], a: "joyful" },
    { q: "big의 반의어는?", options: ["small", "large", "huge"], a: "small" },
    { q: "I go ___ school.", options: ["to", "at", "in"], a: "to" },
    { q: "mouse의 복수형은?", options: ["mouses", "mice", "mouse"], a: "mice" },
    { q: "맞는 문장은?", options: ["He don't like it", "He doesn't like it", "He not like it"], a: "He doesn't like it" },
    { q: "yesterday에 맞는 시제는?", options: ["do", "did", "done"], a: "did" },
    { q: "child의 복수형은?", options: ["childs", "children", "childes"], a: "children" },
  ],
  수학: [
    { q: "2x + 5 = 13, x는?", options: ["3", "4", "5"], a: "4" },
    { q: "5x - 7 = 18, x는?", options: ["5", "4", "6"], a: "5" },
    { q: "7 + 6 × 2 = ?", options: ["26", "19", "20"], a: "19" },
    { q: "(-3)² =", options: ["9", "-9", "3"], a: "9" },
    { q: "1/2 + 1/3 =", options: ["5/6", "2/5", "3/5"], a: "5/6" },
    { q: "0.5 × 0.2 =", options: ["0.1", "0.2", "0.7"], a: "0.1" },
    { q: "삼각형 내각의 합은?", options: ["180도", "360도", "90도"], a: "180도" },
    { q: "2³ =", options: ["6", "8", "9"], a: "8" },
    { q: "12 ÷ 3 =", options: ["3", "4", "6"], a: "4" },
    { q: "√16 =", options: ["2", "4", "8"], a: "4" },
    { q: "20 ÷ 4 =", options: ["4", "5", "6"], a: "5" },
  ],
  과학: [
    { q: "지구가 스스로 도는 것은?", options: ["공전", "자전", "회전"], a: "자전" },
    { q: "물의 상태가 아닌 것은?", options: ["고체", "액체", "플라스마"], a: "플라스마" },
    { q: "사람의 호흡 기관은?", options: ["폐", "위", "심장"], a: "폐" },
    { q: "빛이 통과하지 못하는 물체는?", options: ["투명", "반투명", "불투명"], a: "불투명" },
    { q: "철이 녹스는 현상은?", options: ["증발", "부식", "융해"], a: "부식" },
    { q: "태양의 에너지가 전달되는 방식은?", options: ["전도", "대류", "복사"], a: "복사" },
    { q: "전류의 방향은?", options: ["-에서 +", "+에서 -", "무작위"], a: "+에서 -" },
    { q: "전기의 방전 현상은?", options: ["번개", "바람", "비"], a: "번개" },
    { q: "물의 끓는점은?", options: ["50℃", "80℃", "100℃"], a: "100℃" },
    { q: "광합성이 일어나는 곳은?", options: ["뿌리", "줄기", "잎"], a: "잎" },
    { q: "지구 자전으로 생기는 것은?", options: ["계절", "밤과 낮", "달의 위상"], a: "밤과 낮" },
  ],
  사회: [
    { q: "입법권을 가진 기관은?", options: ["국회", "대통령", "법원"], a: "국회" },
    { q: "행정권을 가진 기관은?", options: ["국회", "대통령", "법원"], a: "대통령" },
    { q: "사법권을 가진 기관은?", options: ["국회", "대통령", "법원"], a: "법원" },
    { q: "대한민국의 수도는?", options: ["서울", "부산", "대전"], a: "서울" },
    { q: "대통령 임기는?", options: ["4년", "5년", "6년"], a: "5년" },
    { q: "국회의원 임기는?", options: ["4년", "5년", "6년"], a: "4년" },
    { q: "우리나라 통화 단위는?", options: ["원", "달러", "엔"], a: "원" },
    { q: "광복 연도는?", options: ["1945", "1950", "1960"], a: "1945" },
    { q: "6·25 전쟁 발발 연도는?", options: ["1945", "1950", "1953"], a: "1950" },
    { q: "헌법 제정 연도는?", options: ["1948", "1950", "1945"], a: "1948" },
    { q: "4·19 혁명 연도는?", options: ["1950", "1960", "1970"], a: "1960" },
  ],
};

/* ===============================
   컴포넌트
================================ */

export default function MiniTestPage() {
  const subjects = Object.keys(miniTests);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [subject, setSubject] = useState(subjects[0]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any>({});
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    const shuffled = [...miniTests[subject]].sort(() => Math.random() - 0.5);
    setQuestions(shuffled.slice(0, 10));
    setAnswers({});
    setResult(null);
    setStartTime(new Date());
  }, [subject]);

  const submit = async () => {
    const elapsed = Math.floor(
      (new Date().getTime() - startTime!.getTime()) / 1000
    );
    const score = questions.filter((q, i) => answers[i] === q.a).length;

    setResult({ elapsed, score });

    if (user) {
      await addDoc(collection(db, "scores"), {
        uid: user.uid,
        subject,
        score,
        total: 10,
        elapsed,
        createdAt: new Date(),
      });
    }
  };

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-4xl text-orange-400 text-center">내 머리 좀 좋다? 바로 테스트!</h1>

        {/* 과목 선택 */}
        <div className="flex flex-wrap gap-2 justify-center">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className={`px-4 py-2 rounded-full border transition
                ${subject === s
                  ? "bg-orange-400 text-white"
                  : "bg-white hover:bg-orange-100"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* 문제 */}
        {questions.map((q, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-xl shadow space-y-3"
          >
            <h3 className="font-semibold">
              {i + 1}. {q.q}
            </h3>
            <div className="space-y-2">
              {q.options.map((o: string) => (
                <label
                  key={o}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer border
                    ${answers[i] === o
                      ? "bg-orange-100 border-orange-400"
                      : "hover:bg-gray-50"}`}
                >
                  <input
                    type="radio"
                    name={`q-${i}`}
                    checked={answers[i] === o}
                    onChange={() =>
                      setAnswers({ ...answers, [i]: o })
                    }
                  />
                  {o}
                </label>
              ))}
            </div>
          </div>
        ))}

        {/* 제출 */}
        {!result && (
          <button
            onClick={submit}
            className="w-full py-3 bg-orange-400 text-white rounded-xl text-lg font-semibold hover:bg-orange-500"
          >
            제출하기
          </button>
        )}

        {/* 결과 */}
        {result && (
          <div className="bg-orange-50 p-6 rounded-xl text-center space-y-4">
            <p className="text-lg">⏱ 푼 시간: {result.elapsed}초</p>
            <p className="text-xl font-bold">
              ✅ 맞은 개수: {result.score} / 10
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => router.push("/wrong-note")}
                className="px-5 py-2 bg-orange-300 text-white rounded-lg hover:bg-orange-400"
              >
                오답노트 쓰기
              </button>
              <button
                onClick={() => router.push("/ppt")}
                className="px-5 py-2 bg-orange-300 text-white rounded-lg hover:bg-orange-400"
              >
                PPT 쓰기
              </button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
