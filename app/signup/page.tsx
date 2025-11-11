"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "../../components/PageContainer";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    try {
      // ✅ Firebase Auth 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ Firestore에 유저 정보 저장
      await setDoc(doc(db, "users", user.uid), {
        email,
        nickname,
        createdAt: serverTimestamp(),
      });

      // ✅ Firebase Auth displayName 업데이트 (햄버거 메뉴에서 바로 표시 가능)
      await updateProfile(user, { displayName: nickname });

      alert(`${nickname}님, 회원가입이 완료되었습니다 🎉`);
      router.push("/login");
    } catch (err: any) {
      console.error("회원가입 오류:", err);
      setError("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <PageContainer>
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-lg">
          <h1 className="text-3xl font-bold text-center text-green-400 mb-6">
            회원가입
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
            새로운 계정을 만들어주세요.
          </p>

          <form className="flex flex-col gap-4" onSubmit={handleSignup}>
            <input
              type="text"
              placeholder="닉네임"
              className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="이메일"
              className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="비밀번호"
              className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="비밀번호 확인"
              className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              className="mt-4 px-6 py-3 bg-green-400 text-white rounded-xl shadow hover:bg-green-500 transition"
            >
              회원가입
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600 dark:text-gray-300">
            이미 계정이 있으신가요?{" "}
            <a href="/login" className="text-blue-400 hover:underline">
              로그인
            </a>
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
