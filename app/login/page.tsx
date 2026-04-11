"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "../../components/PageContainer";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [nickname, setNickname] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // 1. Firebase Auth 로그인
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Firestore에서 닉네임 가져오기
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setNickname(userData.nickname);
        alert(`${userData.nickname}님 환영합니다!`);
      } else {
        alert("닉네임 정보를 찾을 수 없습니다.");
      }

      // 3. 홈으로 이동
      router.push("/home");

    } catch (err: any) {
      console.error("로그인 오류:", err);
      setError("로그인에 실패했습니다. 이메일 또는 비밀번호를 확인하세요.");
    }
  };

  return (
    <PageContainer>
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-lg">
          <h1 className="text-3xl font-bold text-center text-blue-400 mb-6">
            로그인
          </h1>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="이메일"
              className="px-4 py-3 rounded-lg border"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="비밀번호"
              className="px-4 py-3 rounded-lg border"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              className="mt-4 px-6 py-3 bg-blue-400 text-white rounded-xl"
            >
              로그인
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600">
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
