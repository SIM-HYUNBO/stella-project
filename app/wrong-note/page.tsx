"use client";

import { useState } from "react";

export default function WrongNotePage() {
  const [form, setForm] = useState({
    question: "",
    wrongAnswer: "",
    reason: "",
    solution: "",
    correctAnswer: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSave = () => {
    // 🔥 이미 Firebase 연결되어 있다고 하셨으므로 여기만 교체하면 됨
    // 예: addDoc(collection(db, "wrongNotes"), form);

    alert("오답노트가 저장되었습니다!");
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-xl bg-white shadow-lg rounded-2xl p-6">
        
        {/* TITLE */}
        <h2 className="text-2xl font-bold text-center mb-6">오답노트</h2>

        {/* 틀린 문제 입력 */}
        <div className="mb-4">
          <label className="block font-semibold mb-1">틀린문제 입력</label>
          <textarea
            name="question"
            value={form.question}
            onChange={handleChange}
            className="w-full border rounded-lg p-3 h-20"
            placeholder="틀린 문제 내용을 적어주세요"
          />
        </div>

        {/* 오답 입력 */}
        <div className="mb-4">
          <label className="block font-semibold mb-1">오답 입력</label>
          <input
            name="wrongAnswer"
            value={form.wrongAnswer}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
            placeholder="내가 적은 오답"
          />
        </div>

        {/* 틀린 이유 입력 */}
        <div className="mb-4">
          <label className="block font-semibold mb-1">틀린이유 입력</label>
          <textarea
            name="reason"
            value={form.reason}
            onChange={handleChange}
            className="w-full border rounded-lg p-3 h-20"
            placeholder="왜 틀렸는지 적어주세요"
          />
        </div>

        {/* 풀이 입력 */}
        <div className="mb-4">
          <label className="block font-semibold mb-1">풀이 입력</label>
          <textarea
            name="solution"
            value={form.solution}
            onChange={handleChange}
            className="w-full border rounded-lg p-3 h-20"
            placeholder="정확한 풀이 과정을 적어주세요"
          />
        </div>

        {/* 정답 입력 */}
        <div className="mb-6">
          <label className="block font-semibold mb-1">정답 입력</label>
          <input
            name="correctAnswer"
            value={form.correctAnswer}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
            placeholder="문제의 올바른 정답"
          />
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
        >
          저장하기
        </button>
      </div>
    </div>
  );
}
