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

// 미니 테스트 데이터
const miniTests = {
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

export default function Study() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  /** 체크리스트 **/
  const [checklist, setChecklist] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [editIndex, setEditIndex] = useState(null);
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

  const toggleCheck = (i) => {
    const list = [...checklist];
    list[i].checked = !list[i].checked;
    setChecklist(list);
  };

  const removeItem = (i) => {
    const list = [...checklist];
    list.splice(i, 1);
    setChecklist(list);
  };

  const startEdit = (i) => {
    setEditIndex(i);
    setEditText(checklist[i].text);
  };

  const saveEdit = () => {
    const list = [...checklist];
    list[editIndex].text = editText;
    setChecklist(list);
    setEditIndex(null);
    setEditText("");
  };

  /** 채팅 **/
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [nickname, setNickname] = useState("익명");
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingMsgText, setEditingMsgText] = useState("");

  useEffect(() => {
    const q = query(collection(db, "studyChat"), orderBy("createdAt"));
    const unsub = onSnapshot(q, (snap) =>
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return unsub;
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

  const deleteMessage = async (id) => {
    await deleteDoc(doc(db, "studyChat", id));
  };

  const startEditingMessage = (msg) => {
    setEditingMsgId(msg.id);
    setEditingMsgText(msg.text);
  };

  const saveEditedMessage = async () => {
    const ref = doc(db, "studyChat", editingMsgId);
    await updateDoc(ref, { text: editingMsgText });
    setEditingMsgId(null);
    setEditingMsgText("");
  };

  /** 미니 테스트 **/
  const subjects = ["국어", "영어", "수학"];
  const [currentSubject, setCurrentSubject] = useState("국어");
  const [testIndex, setTestIndex] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const quiz = miniTests[currentSubject][testIndex];

  const answerTest = (opt) => {
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

  /** 로딩 처리 **/
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const formatTime = (t) => {
    const d = new Date(t);
    return `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  if (loading) return <CenterSpinner />;

  return (
    <PageContainer>
      <div className="flex flex-col w-full min-h-screen p-8 gap-12">

        {/* 체크리스트 */}
        <div className="p-6 rounded-2xl shadow bg-white/70 max-w-xl">
          <h3 className="text-xl font-bold text-orange-600 mb-4">📋 체크리스트</h3>
          <div className="flex gap-2 mb-4">
            <input
              className="flex-1 p-3 rounded-lg bg-orange-50 border text-orange-900"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="할 일을 입력하세요"
            />
            <button onClick={addItem} className="px-4 py-2 bg-orange-500 text-white rounded-lg">
              추가
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={item.checked} onChange={() => toggleCheck(i)} />
                  {editIndex === i ? (
                    <input
                      className="p-1 bg-white border rounded text-orange-900"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                  ) : (
                    <span className={`text-orange-900 ${item.checked ? "line-through opacity-60" : ""}`}>
                      {item.text}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {editIndex === i ? (
                    <button onClick={saveEdit} className="text-green-600 font-semibold">저장</button>
                  ) : (
                    <button onClick={() => startEdit(i)} className="text-blue-600">수정</button>
                  )}
                  <button onClick={() => removeItem(i)} className="text-red-600">삭제</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 채팅 */}
        <div className="p-6 rounded-2xl shadow bg-white/70 max-w-xl">
          <h3 className="text-xl font-bold text-orange-600 mb-4">💬 채팅방</h3>
          <input
            className="w-full p-3 mb-3 bg-orange-50 border rounded-lg text-orange-900"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임 입력"
          />
          <div className="h-60 overflow-y-auto bg-orange-50 rounded p-3 mb-4 text-orange-900">
            {messages.map((m) => (
              <div key={m.id} className="mb-3 p-2 bg-white/80 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-orange-700">{m.nickname || "익명"}</span>
                  <span className="text-sm opacity-70">{formatTime(m.createdAt)}</span>
                </div>
                {editingMsgId === m.id ? (
                  <>
                    <input
                      className="w-full p-1 bg-white border rounded mb-2"
                      value={editingMsgText}
                      onChange={(e) => setEditingMsgText(e.target.value)}
                    />
                    <button onClick={saveEditedMessage} className="text-green-600 mr-2">저장</button>
                    <button onClick={() => setEditingMsgId(null)} className="text-gray-600">취소</button>
                  </>
                ) : (
                  <p>{m.text}</p>
                )}
                <div className="flex gap-3 mt-1 text-sm">
                  <button onClick={() => setReplyTo(m)} className="text-blue-600">답글</button>
                  <button onClick={() => startEditingMessage(m)} className="text-green-600">수정</button>
                  <button onClick={() => deleteMessage(m.id)} className="text-red-600">삭제</button>
                </div>
                {m.replyTo && (
                  <div className="ml-4 mt-2 p-2 bg-orange-100 rounded text-sm">↳ {m.replyTo.text}</div>
                )}
              </div>
            ))}
          </div>
          {replyTo && (
            <div className="mb-2 p-2 bg-orange-100 rounded text-sm text-orange-900">
              ↳ {replyTo.text}
              <button onClick={() => setReplyTo(null)} className="ml-2 text-red-600 text-xs">취소</button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              className="flex-1 p-3 rounded-lg bg-orange-50 border text-orange-900"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="메시지를 입력하세요"
            />
            <button onClick={sendMessage} className="px-4 py-2 bg-orange-500 text-white rounded-lg">전송</button>
          </div>
        </div>

        {/* 미니 테스트 */}
        <div className="p-6 rounded-2xl shadow bg-white/70 max-w-xl">
          <h3 className="text-xl font-bold text-orange-600 mb-4">📝 미니 테스트</h3>
          <div className="flex gap-2 mb-4">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => { setCurrentSubject(s); resetTest(); }}
                className={`px-3 py-1 rounded-lg ${currentSubject === s ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-900"}`}
              >
                {s}
              </button>
            ))}
          </div>
          {!finished ? (
            <>
              <p className="mb-3 text-orange-900">{quiz.q}</p>
              <div className="flex flex-col gap-2">
                {quiz.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => answerTest(opt)}
                    className="p-2 bg-orange-100 rounded-lg text-orange-900"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-orange-900 font-bold">
              테스트 완료! 점수: {testScore}/{miniTests[currentSubject].length}
              <button onClick={resetTest} className="ml-4 px-3 py-1 bg-orange-500 text-white rounded-lg">다시하기</button>
            </div>
          )}
        </div>

        {/* 수학 마을 버튼 */}
        <div className="flex items-center justify-center w-full h-screen bg-green-100">
  <button
    onClick={() => router.push("/MathLand3D")}
    className="px-12 py-6 bg-green-600 text-white text-2xl font-bold rounded-3xl shadow-lg hover:bg-green-700 transition"
  >
    🏡 수학 마을 가기
  </button>
</div>


      </div>
    </PageContainer>
  );
}
