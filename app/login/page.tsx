"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "../../components/PageContainer";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // ✅ Firestore에서 닉네임으로 이메일 찾기
      const q = query(collection(db, "users"), where("nickname", "==", nickname));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("해당 닉네임을 가진 사용자가 없습니다.");
        return;
      }

      const userData = snapshot.docs[0].data();
      const email = userData.email;

      // ✅ 이메일 + 비밀번호로 로그인
      await signInWithEmailAndPassword(auth, email, password);

      alert(`${nickname}님 환영합니다!`);
      router.push("/");
    } catch (err: any) {
      console.error("로그인 오류:", err);
      setError("로그인에 실패했습니다. 닉네임 또는 비밀번호를 확인하세요.");
    }
  };

  return (
    <PageContainer>
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-lg">
          <h1 className="text-3xl font-bold text-center text-blue-400 mb-6">
            로그인
          </h1>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="닉네임"
              className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="비밀번호"
              className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              className="mt-4 px-6 py-3 bg-blue-400 text-white rounded-xl shadow hover:bg-blue-500 transition"
            >
              로그인
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600 dark:text-gray-300">
            계정이 없으신가요?{" "}
            <a href="/signup" className="text-green-400 hover:underline">
              회원가입
            </a>
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
