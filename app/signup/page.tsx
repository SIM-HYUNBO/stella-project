"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { saveFCMToken } from "../hooks/usePushSubscription";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않아요.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 해요.");
      return;
    }
    if (nickname.trim().length < 2) {
      setError("닉네임은 2자 이상이어야 해요.");
      return;
    }
    if (!birthdate) {
      setError("생년월일을 입력해주세요.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("올바른 전화번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        nickname: nickname.trim(),
        birthdate,
        phone: phone.replace(/\D/g, ""),
        createdAt: serverTimestamp(),
      });

      // 신규 가입자 푸쉬 알림 자동 활성화
      try {
        if ("serviceWorker" in navigator && "PushManager" in window) {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            await saveFCMToken(nickname.trim());
          }
        }
      } catch {
        // 알림 설정 실패는 무시하고 계속 진행
      }

      router.push("/home");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") setError("이미 사용 중인 이메일이에요.");
      else if (err.code === "auth/invalid-email") setError("올바른 이메일 형식이 아니에요.");
      else if (err.code === "auth/weak-password") setError("비밀번호가 너무 약해요.");
      else setError(`회원가입 실패: ${err.code || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gray-50" />

      <div className="relative z-10 min-h-screen flex flex-col justify-center px-5 py-10">

        {/* 브랜드 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-sky-100 mb-4">
            <img src="/wag.png" alt="logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-4xl font-black tracking-[0.18em] text-sky-600">WAGIE</h1>
          <p className="text-sky-700 text-sm font-medium mt-2">처음 만나서 반가워요 🧡</p>
        </div>

        {/* 폼 카드 */}
        <div className="rounded-[28px] bg-white/80 backdrop-blur-md px-6 py-7 space-y-4">
          <p className="font-black text-slate-800 text-xl mb-1">회원가입</p>

          <form onSubmit={handleSignup} className="space-y-3">
            <input
              type="text" placeholder="닉네임 (2자 이상)" value={nickname}
              onChange={(e) => setNickname(e.target.value)} required
              className="w-full bg-sky-50/80 rounded-[16px] px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-300 transition"
            />
            <input
              type="email" placeholder="이메일" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-sky-50/80 rounded-[16px] px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-300 transition"
            />
            <div className="relative">
              <input
                type="date" value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)} required
                className="w-full bg-sky-50/80 rounded-[16px] px-4 py-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-sky-300 transition"
              />
              {!birthdate && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">생년월일</span>}
            </div>
            <input
              type="tel" placeholder="전화번호 (숫자만)" value={phone}
              onChange={(e) => setPhone(e.target.value)} required
              className="w-full bg-sky-50/80 rounded-[16px] px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-300 transition"
            />
            <input
              type="password" placeholder="비밀번호 (6자 이상)" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className="w-full bg-sky-50/80 rounded-[16px] px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-300 transition"
            />
            <input
              type="password" placeholder="비밀번호 확인" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} required
              className="w-full bg-sky-50/80 rounded-[16px] px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-300 transition"
            />

            {error && (
              <div className="rounded-[14px] bg-red-50 border border-red-100 px-4 py-3 text-red-500 text-sm font-medium text-center">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="group relative w-full h-14 rounded-[18px] overflow-hidden active:scale-[0.98] transition-transform disabled:opacity-70">
              <div className="absolute inset-0 bg-sky-400" />
              <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.15)_50%,transparent_60%)] animate-[shimmer_3s_infinite]" />
              <span className="relative text-white font-black text-base">
                {loading ? "가입 중..." : "가입하기 🌸"}
              </span>
            </button>
          </form>
        </div>

        {/* 로그인 링크 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            이미 계정이 있어요?{" "}
            <Link href="/login" className="text-sky-600 font-bold underline underline-offset-2">
              로그인
            </Link>
          </p>
        </div>

      </div>

      <style>{`
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </main>
  );
}
