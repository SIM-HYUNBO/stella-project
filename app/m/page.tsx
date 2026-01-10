"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";
import PageContainer from "@/components/PageContainer";
import { CenterSpinner } from "@/components/CenterSpinner";

/* ================= 미니 테스트 데이터 ================= */

const miniTests: any = {
  국어: [
    { q: "다음 중 맞춤법이 맞는 것은?", options: ["안돼", "안 돼"], a: "안 돼" },
    { q: "‘곰’의 소리를 흉내 낸 말은?", options: ["웅크", "웅담", "으르렁"], a: "으르렁" },
    { q: "보기 중 반대말이 맞는 것은? (높다)", options: ["낮다", "크다", "작다"], a: "낮다" },
    { q: "빈칸에 들어갈 말은? '나는 학교___ 간다.'", options: ["로", "에", "을"], a: "에" },
    { q: "다음 중 문장이 아닌 것은?", options: ["사과를 먹었다.", "예쁘다.", "학교에"], a: "학교에" },
  ],
  영어: [
    { q: "Apple의 뜻은?", options: ["사과", "바나나", "복숭아"], a: "사과" },
    { q: "Dog는?", options: ["고양이", "강아지", "새"], a: "강아지" },
    { q: "Sun은?", options: ["태양", "달", "별"], a: "태양" },
    { q: "Red는 어떤 색인가?", options: ["빨강", "파랑", "노랑"], a: "빨강" },
    { q: "Fish의 뜻은?", options: ["물고기", "새", "거북이"], a: "물고기" },
  ],
  수학: [
    { q: "5 + 7 = ?", options: ["11", "12", "13"], a: "12" },
    { q: "9 - 4 = ?", options: ["5", "6", "4"], a: "5" },
    { q: "3 × 4 = ?", options: ["12", "10", "14"], a: "12" },
    { q: "20 ÷ 5 = ?", options: ["3", "4", "5"], a: "4" },
    { q: "10보다 3 큰 수는?", options: ["12", "13", "14"], a: "13" },
  ],
};

const hintsTemplate: any = {
  국어: [
    "맞춤법 규칙을 떠올려 봐.",
    "곰이 화났을 때 소리를 생각해.",
    "의미가 반대인지 확인!",
    "학교에 ‘들어간다’는 느낌!",
    "주어+서술어 체크!",
  ],
  영어: [
    "apple = 과일",
    "dog = 반려동물",
    "sun = 하늘에 있음",
    "red = 색깔",
    "fish = 물속",
  ],
  수학: [
    "5+5+2",
    "9-4",
    "3×4",
    "20÷5",
    "10+3",
  ],
};

export default function Study() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  /* ================= 체크리스트 ================= */

  const [checklist, setChecklist] = useState<any[]>([]);
  const [newItem, setNewItem] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("checklist");
    if (saved) setChecklist(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("checklist", JSON.stringify(checklist));
  }, [checklist]);

  const addItem = () => {
    if (!newItem.trim()) return;
    setChecklist([...checklist, { text: newItem, checked: false }]);
    setNewItem("");
  };

  const toggleCheck = (i: number) => {
    const list = [...checklist];
    list[i].checked = !list[i].checked;
    setChecklist(list);
  };

  const removeItem = (i: number) => {
    const list = [...checklist];
    list.splice(i, 1);
    setChecklist(list);
  };

  const startEdit = (i: number) => {
    setEditIndex(i);
    setEditText(checklist[i].text);
  };

  const saveEdit = () => {
    if (editIndex === null) return;
    const list = [...checklist];
    list[editIndex].text = editText;
    setChecklist(list);
    setEditIndex(null);
    setEditText("");
  };

  /* ================= 채팅 ================= */

  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [nickname, setNickname] = useState("익명");
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgText, setEditingMsgText] = useState("");

  useEffect(() => {
    const q = query(collection(db, "studyChat"), orderBy("createdAt"));
    return onSnapshot(q, (snap) =>
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    await addDoc(collection(db, "studyChat"), {
      text: chatInput,
      nickname,
      replyTo,
      createdAt: Date.now(),
    });
    setChatInput("");
    setReplyTo(null);
  };

  const deleteMessage = async (id: string) => {
    await deleteDoc(doc(db, "studyChat", id));
  };

  const startEditingMessage = (msg: any) => {
    setEditingMsgId(msg.id);
    setEditingMsgText(msg.text);
  };

  const saveEditedMessage = async () => {
    if (!editingMsgId) return;
    await updateDoc(doc(db, "studyChat", editingMsgId), {
      text: editingMsgText,
    });
    setEditingMsgId(null);
    setEditingMsgText("");
  };

  /* ================= 미니 테스트 ================= */

  const subjects = ["국어", "영어", "수학"];
  const [currentSubject, setCurrentSubject] = useState("국어");
  const [testIndex, setTestIndex] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const quiz = miniTests[currentSubject][testIndex];
  const hint = hintsTemplate[currentSubject][testIndex];

  const answerTest = (opt: string) => {
    if (opt === quiz.a) setTestScore((s) => s + 1);
    if (testIndex < miniTests[currentSubject].length - 1) {
      setTestIndex((i) => i + 1);
    } else {
      setFinished(true);
    }
  };

  const resetTest = () => {
    setTestIndex(0);
    setTestScore(0);
    setFinished(false);
  };

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  if (loading) return <CenterSpinner />;

  return (
    <PageContainer>
      <div className="flex flex-col min-h-screen p-8 gap-12">
        <div className="max-w-3xl mx-auto space-y-8">

          <h1 className="text-4xl text-orange-400 text-center">
            내 머리 좀 좋다? 바로 테스트!
          </h1>

          {/* 체크리스트 */}
          <section className="p-6 bg-white/80 rounded-2xl shadow">
            <h3 className="text-xl font-bold text-orange-900 mb-4">📋 체크리스트</h3>

            <div className="flex gap-2 mb-4">
              <input
                className="flex-1 p-3 border rounded-lg"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
              />
              <button
                onClick={addItem}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                추가
              </button>
            </div>

            {checklist.map((item, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg mb-2">
                <div className="flex gap-2 items-center">
                  <input type="checkbox" checked={item.checked} onChange={() => toggleCheck(i)} />
                  {editIndex === i ? (
                    <input
                      className="border p-1 rounded"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                  ) : (
                    <span className={item.checked ? "line-through opacity-60" : ""}>
                      {item.text}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {editIndex === i ? (
                    <button onClick={saveEdit} className="text-green-600">저장</button>
                  ) : (
                    <button onClick={() => startEdit(i)} className="text-blue-600">수정</button>
                  )}
                  <button onClick={() => removeItem(i)} className="text-red-600">삭제</button>
                </div>
              </div>
            ))}
          </section>

          {/* 채팅 */}
          <section className="p-6 bg-white/80 rounded-2xl shadow">
            <h3 className="text-xl font-bold text-orange-900 mb-4">💬 채팅</h3>

            <input
              className="w-full p-2 mb-2 border rounded"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임"
            />

            <div className="h-64 overflow-y-auto mb-3">
              {messages.map((m) => (
                <div key={m.id} className="bg-gray-50 p-3 rounded mb-2">
                  <b>{m.nickname}</b>
                  {editingMsgId === m.id ? (
                    <>
                      <input
                        className="w-full border p-1 my-1"
                        value={editingMsgText}
                        onChange={(e) => setEditingMsgText(e.target.value)}
                      />
                      <button onClick={saveEditedMessage} className="text-green-600 mr-2">저장</button>
                      <button onClick={() => setEditingMsgId(null)} className="text-gray-500">취소</button>
                    </>
                  ) : (
                    <p>{m.text}</p>
                  )}
                  <div className="flex gap-3 text-sm mt-1">
                    <button onClick={() => setReplyTo(m)} className="text-blue-600">답글</button>
                    <button onClick={() => startEditingMessage(m)} className="text-green-600">수정</button>
                    <button onClick={() => deleteMessage(m.id)} className="text-red-600">삭제</button>
                  </div>
                </div>
              ))}
            </div>

            {replyTo && (
              <div className="text-sm mb-2 text-gray-600">
                ↳ {replyTo.text}
              </div>
            )}

            <div className="flex gap-2">
              <input
                className="flex-1 border rounded p-2"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                전송
              </button>
            </div>
          </section>

          {/* 미니 테스트 */}
          <section className="p-6 bg-white/80 rounded-2xl shadow">
            <h3 className="text-xl font-bold text-orange-900 mb-4">📝 미니 테스트</h3>

            <div className="flex gap-2 mb-4">
              {subjects.map((s) => (
                <button
                  key={s}
                  onClick={() => { setCurrentSubject(s); resetTest(); }}
                  className="px-3 py-1 bg-orange-100 rounded hover:bg-orange-200"
                >
                  {s}
                </button>
              ))}
            </div>

            {!finished ? (
              <>
                <p className="mb-3">{quiz.q}</p>
                {quiz.options.map((o: string) => (
                  <button
                    key={o}
                    onClick={() => answerTest(o)}
                    className="block w-full mb-2 p-2 bg-orange-100 rounded hover:bg-orange-200"
                  >
                    {o}
                  </button>
                ))}
                <button
                  onClick={() => setShowHint((v) => !v)}
                  className="mt-2 text-sm text-blue-600"
                >
                  ❓
                </button>
                {showHint && <div className="mt-2 text-sm text-gray-600">{hint}</div>}
              </>
            ) : (
              <div>
                점수 {testScore}/{miniTests[currentSubject].length}
                <button
                  onClick={resetTest}
                  className="ml-3 px-3 py-1 bg-orange-500 text-white rounded"
                >
                  다시하기
                </button>
              </div>
            )}
          </section>

        </div>
      </div>
    </PageContainer>
  );
}
