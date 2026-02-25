 "use client";
 
 import { useState } from "react";

type MBTIKey = "E" | "I" | "N" | "S" | "F" | "T" | "J" | "P";

interface Question {
  q: string;
  a: string;
  b: string;
  typeA: MBTIKey;
  typeB: MBTIKey;
}

export default function App() {
  const questions: Question[] = [
    { q: "친구들이랑 노는 게 좋다?", a: "완전 좋아!", typeA: "E", b: "혼자도 좋아", typeB: "I" },
    { q: "숙제는?", a: "미리미리 한다", typeA: "J", b: "마지막에 한다", typeB: "P" },
    { q: "발표 시간은?", a: "재밌다!", typeA: "E", b: "조금 떨린다", typeB: "I" },
    { q: "계획 세우는 거?", a: "좋다!", typeA: "J", b: "즉흥이 좋다", typeB: "P" },
    { q: "상상하는 거 좋아해?", a: "완전 좋아!", typeA: "N", b: "현실이 더 좋다", typeB: "S" },
    { q: "결정할 때?", a: "마음이 중요", typeA: "F", b: "논리가 중요", typeB: "T" },
  ];

  const [current, setCurrent] = useState<number>(0);
  const [scores, setScores] = useState<Record<MBTIKey, number>>({
    E: 0, I: 0, N: 0, S: 0, F: 0, T: 0, J: 0, P: 0,
  });
  const [result, setResult] = useState<string>("");

  const handleAnswer = (type: MBTIKey) => {
    const newScores = { ...scores, [type]: scores[type] + 1 };
    setScores(newScores);

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      calculateResult(newScores);
    }
  };

  const calculateResult = (finalScores: Record<MBTIKey, number>) => {
    const mbti =
      (finalScores.E >= finalScores.I ? "E" : "I") +
      (finalScores.N >= finalScores.S ? "N" : "S") +
      (finalScores.F >= finalScores.T ? "F" : "T") +
      (finalScores.J >= finalScores.P ? "J" : "P");

    const messages: Record<string, string> = {
      ENFJ: "🔥 리더형! 친구들을 잘 챙겨요!",
      INFP: "🌈 상상력 풍부한 감성형!",
      ESTJ: "🚀 책임감 강한 행동파!",
      ISFP: "🎨 예술 감각이 뛰어난 타입!",
    };

    setResult(`${mbti} - ${messages[mbti] ?? "⭐ 멋진 성격의 주인공!"}`);
  };

  const resetTest = () => {
    setCurrent(0);
    setScores({ E: 0, I: 0, N: 0, S: 0, F: 0, T: 0, J: 0, P: 0 });
    setResult("");
  };

  const progress = ((current) / questions.length) * 100;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={{ marginBottom: 10 }}>🌟 학생용 쉬운 MBTI 테스트 🌟</h2>

        {result === "" ? (
          <>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>

            <p>문제 {current + 1} / {questions.length}</p>
            <h3>{questions[current].q}</h3>

            <button
              style={styles.button}
              onClick={() => handleAnswer(questions[current].typeA)}
            >
              {questions[current].a}
            </button>

            <button
              style={{ ...styles.button, backgroundColor: "#ff8fab" }}
              onClick={() => handleAnswer(questions[current].typeB)}
            >
              {questions[current].b}
            </button>
          </>
        ) : (
          <>
            <div style={styles.resultBox}>
              🎉 결과 🎉
              <p style={{ fontSize: 22, fontWeight: "bold", marginTop: 15 }}>
                {result}
              </p>
            </div>
            <button style={styles.button} onClick={resetTest}>
              다시하기
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    background: "#ffffff",
    padding: 30,
    borderRadius: 20,
    width: 380,
    textAlign: "center",
    boxShadow: "0 15px 40px rgba(0,0,0,0.2)",
    transition: "0.3s",
  },
  button: {
    display: "block",
    width: "100%",
    margin: "12px 0",
    padding: "12px",
    borderRadius: 12,
    border: "none",
    backgroundColor: "#667eea",
    color: "white",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: "bold",
    transition: "0.2s",
  },
  progressBar: {
    height: 8,
    width: "100%",
    backgroundColor: "#eee",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 15,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#667eea",
    transition: "0.3s",
  },
  resultBox: {
    backgroundColor: "#f3f4ff",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
};