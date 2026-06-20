"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [keepLogin, setKeepLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await setPersistence(auth, keepLogin ? browserLocalPersistence : browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userDoc.exists()) alert(`${userDoc.data().nickname}님 환영합니다!`);
      router.push("/home");
    } catch {
      setError("이메일 또는 비밀번호가 올바르지 않아요.");
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
          <p className="text-sky-700 text-sm font-medium mt-2">다시 만나서 반가워요 🧡</p>
        </div>

        {/* 폼 카드 */}
        <div className="rounded-[28px] bg-white/80 backdrop-blur-md px-6 py-7 space-y-4">
          <p className="font-black text-slate-800 text-xl mb-1">로그인</p>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email" placeholder="이메일" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-sky-50/80 rounded-[16px] px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-300 transition"
            />
            <input
              type="password" placeholder="비밀번호" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className="w-full bg-sky-50/80 rounded-[16px] px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-300 transition"
            />

            <label className="flex items-center gap-2.5 cursor-pointer select-none px-1">
              <div
                onClick={() => setKeepLogin(!keepLogin)}
                className={`w-10 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 ${keepLogin ? "bg-sky-200" : "bg-gray-200"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-all duration-300 ${keepLogin ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className="text-sm text-slate-500 font-medium">로그인 상태 유지</span>
            </label>

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
                {loading ? "로그인 중..." : "로그인 💭"}
              </span>
            </button>
          </form>
        </div>

        {/* 회원가입 링크 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            아직 계정이 없어요?{" "}
            <Link href="/signup" className="text-sky-600 font-bold underline underline-offset-2">
              회원가입
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
