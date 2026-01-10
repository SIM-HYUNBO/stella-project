"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "../../components/PageContainer";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";

// 관리자 닉네임 제한 키워드
const ADMIN_KEYWORDS = ["admin", "manager", "root"];

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [checkingNickname, setCheckingNickname] = useState(false);

  // 닉네임 검증 함수
  const validateNickname = (nick: string): string | null => {
    const trimmed = nick.trim();

    // 1. 관리자 관련 단어 금지
    if (ADMIN_KEYWORDS.some((kw) => trimmed.toLowerCase().includes(kw))) {
      return "관리자 관련 단어는 사용할 수 없습니다.";
    }

    // 2. 이모지/특수문자 금지 (알파벳, 숫자, 한글만 허용)
    if (!/^[\w가-힣]+$/.test(trimmed)) {
      return "이모지나 특수문자는 사용할 수 없습니다.";
    }

    // 3. 8자 이상 금지
    if (trimmed.length > 8) {
      return "닉네임은 8자 이하로 입력해주세요.";
    }

    // 4. 띄어쓰기 금지
    if (/\s/.test(trimmed)) {
      return "닉네임에 공백을 포함할 수 없습니다.";
    }

    return null;
  };

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

    // 🚨 닉네임 제한 검증
    const nickError = validateNickname(nickname);
    if (nickError) {
      setError(nickError);
      return;
    }

    try {
      setCheckingNickname(true);

      // 🚨 닉네임 중복 체크
      const q = query(collection(db, "users"), where("nickname", "==", nickname));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError("이미 사용 중인 닉네임입니다.");
        setCheckingNickname(false);
        return;
      }

      // ✨ Firebase Auth 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✨ Firestore 유저 정보 저장
      await setDoc(doc(db, "users", user.uid), {
        email,
        nickname,
        createdAt: serverTimestamp(),
      });

      // ✨ displayName 업데이트
      await updateProfile(user, { displayName: nickname });

      alert(`${nickname}님, 회원가입이 완료되었습니다 🎉`);
      router.push("/home");
    } catch (err) {
      console.error("회원가입 오류:", err);
      setError("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setCheckingNickname(false);
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
              disabled={checkingNickname}
              className="mt-4 px-6 py-3 bg-green-400 text-white rounded-xl shadow hover:bg-green-500 transition disabled:bg-gray-400"
            >
              {checkingNickname ? "처리 중..." : "회원가입"}
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
