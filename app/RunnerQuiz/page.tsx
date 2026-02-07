"use client";

import { useState, useEffect } from "react";

/* =========================
   타입
========================= */
type State = {
  understanding: number;
  focus: number;
  stress: number;
  trust: number;
};

type Choice = {
  label: string;
  effects: Partial<State>;
  next: string;
};

type Node = {
  title?: string;
  text: string;
  choices?: Choice[];
  endings?: {
    condition: Partial<State>;
    result: string;
  }[];
  default?: string;
};

/* =========================
   스토리 데이터
========================= */
const story = {
  start: "awakening",
  states: {
    understanding: 0,
    focus: 0,
    stress: 0,
    trust: 0,
  } as State,

  nodes: {
    awakening: {
      title: "시작",
      text: `
눈을 뜨자 희미한 푸른 빛의 화면이 보인다.
너는 지금 '학습 시뮬레이션 시스템' 내부에 접속해 있다.

첫 화면을 어떻게 구성할 것인가?
      `,
      choices: [
        {
          label: "개념을 차분하게 설명하는 페이지를 연다",
          effects: { understanding: 2, stress: 1 },
          next: "theory_room",
        },
        {
          label: "예제 중심의 실습 페이지로 바로 이동한다",
          effects: { focus: 2 },
          next: "example_room",
        },
        {
          label: "아무 설명 없이 퀴즈를 던진다",
          effects: { stress: 2, focus: 1 },
          next: "quiz_room",
        },
      ],
    },
    theory_room: {
      title: "이론 구역",
      text: `
사용자는 화면을 바라보며 천천히 스크롤을 내린다.
문장은 정제되어 있고 설명은 친절하다.

하지만…
텍스트가 길다.
너무 길다.
      `,
      choices: [
        {
          label: "중요한 문장만 강조 표시한다",
          effects: { focus: 2, trust: 1 },
          next: "theory_focus",
        },
        {
          label: "끝까지 설명을 밀어붙인다",
          effects: { understanding: 2, stress: 2 },
          next: "theory_overload",
        },
        {
          label: "중간에 예제를 삽입한다",
          effects: { understanding: 1, focus: 1 },
          next: "example_room",
        },
      ],
    },
    theory_focus: {
      title: "강조된 이론",
      text: `
굵은 글씨.
짧은 문장.
핵심 요약.

사용자의 스크롤 속도가 다시 안정된다.
신뢰도가 조금 오른다.
      `,
      choices: [
        {
          label: "이 타이밍에 문제를 하나 던진다",
          effects: { understanding: 2, focus: 1 },
          next: "quiz_room",
        },
        {
          label: "예제로 자연스럽게 연결한다",
          effects: { understanding: 1, trust: 1 },
          next: "example_room",
        },
      ],
    },
    theory_overload: {
      title: "과부하",
      text: `
페이지는 아직 끝나지 않았다.
스크롤바는 여전히 아래를 가리킨다.

사용자의 한숨이 들리는 듯하다.
스트레스 수치가 눈에 띄게 오른다.
      `,
      choices: [
        {
          label: "지금이라도 요약 섹션을 추가한다",
          effects: { stress: -1, trust: 1 },
          next: "recovery",
        },
        {
          label: "그냥 다음 페이지로 넘긴다",
          effects: { stress: 2 },
          next: "check",
        },
      ],
    },
    example_room: {
      title: "예제 구역",
      text: `
화면에는 실제 사례가 등장한다.
추상적이던 개념이 형태를 갖기 시작한다.

사용자는 고개를 끄덕인다.
"이제야 무슨 말인지 알겠네."
      `,
      choices: [
        {
          label: "예제를 하나 더 보여준다",
          effects: { understanding: 2, focus: 1 },
          next: "deep_example",
        },
        {
          label: "직접 풀어보게 한다",
          effects: { understanding: 1, stress: 1 },
          next: "quiz_room",
        },
      ],
    },
    deep_example: {
      title: "심화 예제",
      text: `
두 번째 예제는 조금 더 복잡하다.
하지만 흐름은 자연스럽다.

사용자의 이해도가 눈에 띄게 상승한다.
      `,
      choices: [
        {
          label: "이제 개념을 정리한다",
          effects: { understanding: 2 },
          next: "check",
        },
      ],
    },
    quiz_room: {
      title: "퀴즈",
      text: `
문제가 등장한다.
사용자는 잠시 멈칫한다.
      `,
      choices: [
        {
          label: "힌트를 제공한다",
          effects: { understanding: 1, stress: -1, trust: 1 },
          next: "quiz_result",
        },
        {
          label: "힌트 없이 진행한다",
          effects: { stress: 1 },
          next: "quiz_result",
        },
      ],
    },
    quiz_result: {
      title: "결과",
      text: `
문제는 제출되었다.
결과가 화면에 표시된다.
      `,
      choices: [
        {
          label: "결과를 해설과 함께 보여준다",
          effects: { understanding: 2, trust: 1 },
          next: "check",
        },
        {
          label: "정답만 표시하고 넘어간다",
          effects: { stress: 1 },
          next: "check",
        },
      ],
    },
    recovery: {
      title: "회복",
      text: `
짧은 요약.
한 문장 정리.

사용자의 숨이 다시 고른다.
아직 기회는 있다.
      `,
      choices: [
        {
          label: "이제 마무리한다",
          effects: { focus: 1 },
          next: "check",
        },
      ],
    },
    check: {
      title: "최종 평가",
      text: `
시스템이 사용자의 상태를 분석한다.
이 학습은 성공이었을까?
      `,
      endings: [
        {
          condition: { understanding: 8, stress: 4 },
          result: "master",
        },
        {
          condition: { understanding: 5 },
          result: "success",
        },
        {
          condition: { stress: 6 },
          result: "dropout",
        },
      ],
      default: "normal",
    },
  } as Record<string, Node>,

  endings: {
    master: "🏆 사용자는 개념을 완전히 체득했다. 이 페이지는 신뢰를 얻었다.",
    success: "🎉 사용자는 이해했다. 다음 학습으로 넘어간다.",
    normal: "🙂 완벽하진 않지만 학습은 이어진다.",
    dropout: "💀 사용자는 피로를 느끼고 페이지를 닫았다.",
  },
};

/* =========================
   컴포넌트
========================= */
export default function StoryGameLong() {
  const [current, setCurrent] = useState(story.start);
  const [state, setState] = useState<State>({ ...story.states });
  const [ending, setEnding] = useState<string | null>(null);

  const node = story.nodes[current];

  /* =========================
     선택 적용
  ========================= */
  const applyChoice = (choice: Choice) => {
    const newState = { ...state };
    Object.entries(choice.effects).forEach(([k, v]) => {
      newState[k as keyof State] += v as number;
    });
    setState(newState);
    setCurrent(choice.next);
  };

  /* =========================
     엔딩 자동 체크
  ========================= */
  useEffect(() => {
    if (ending) return;

    if (node.endings) {
      for (const e of node.endings) {
        const ok = Object.entries(e.condition).every(
          ([k, v]) => state[k as keyof State] >= (v as number)
        );
        if (ok) {
          setEnding(story.endings[e.result]);
          return;
        }
      }
    }

    if (node.default) {
      setEnding(story.endings[node.default]);
    }
  }, [current, state, node.endings, ending]);

  /* =========================
     엔딩 화면
  ========================= */
  if (ending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="max-w-xl p-8 rounded-2xl bg-slate-900">
          <h2 className="text-2xl font-bold mb-4">엔딩</h2>
          <p className="mb-6 whitespace-pre-line">{ending}</p>
          <button
            className="w-full py-2 rounded-xl bg-indigo-600"
            onClick={() => {
              setState({ ...story.states });
              setCurrent(story.start);
              setEnding(null);
            }}
          >
            다시 시작
          </button>
        </div>
      </div>
    );
  }

  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-black text-white">
      <div className="max-w-xl w-full p-8 rounded-2xl bg-slate-900 shadow-2xl">
        <h3 className="text-xl font-bold mb-2">{node.title}</h3>
        <p className="whitespace-pre-line mb-6 text-slate-200">{node.text}</p>

        <div className="text-xs text-slate-400 mb-4">
          이해도 {state.understanding} | 집중 {state.focus} | 스트레스{" "}
          {state.stress} | 신뢰 {state.trust}
        </div>

        <div className="space-y-3">
          {node.choices?.map((c, i) => (
            <button
              key={i}
              onClick={() => applyChoice(c)}
              className="w-full text-left px-4 py-3 rounded-xl bg-slate-800 hover:bg-indigo-600 transition"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
