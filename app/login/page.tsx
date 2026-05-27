"use client";

import { useState } from "react";
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
      else alert("유저 정보를 찾을 수 없습니다.");
      router.push("/home");
    } catch {
      setError("이메일 또는 비밀번호가 올바르지 않아요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-[#fff6ee] via-[#fff0e0] to-[#fff8f0]" />
      <div className="fixed top-[-160px] right-[-160px] w-[500px] h-[500px] rounded-full bg-orange-300/20 blur-[100px] animate-[floatA_10s_ease-in-out_infinite_alternate]" />
      <div className="fixed bottom-[-200px] left-[-160px] w-[480px] h-[480px] rounded-full bg-yellow-300/20 blur-[100px] animate-[floatB_13s_ease-in-out_infinite_alternate]" />
      <div className="fixed top-[35%] left-[20%] w-[300px] h-[300px] rounded-full bg-pink-200/15 blur-[80px] animate-[floatC_8s_ease-in-out_infinite_alternate]" />

      <div className="relative z-10 min-h-screen flex flex-col justify-center px-5 py-10">

        {/* 브랜드 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-gradient-to-br from-orange-400 to-amber-300 shadow-[0_16px_40px_rgba(255,160,50,0.45)] mb-4">
            <span className="text-4xl">💬</span>
          </div>
          <h1 className="text-4xl font-black tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-br from-orange-500 to-amber-400">WAGIE</h1>
          <p className="text-[#b07848] text-sm font-medium mt-2">다시 만나서 반가워요 🧡</p>
        </div>

        {/* 폼 카드 */}
        <div className="rounded-[28px] bg-white/80 backdrop-blur-md border border-orange-100 shadow-[0_12px_40px_rgba(255,150,80,0.15)] px-6 py-7 space-y-4">
          <p className="font-black text-[#3d1f00] text-xl mb-1">로그인</p>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email" placeholder="이메일" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-orange-50/80 border border-orange-100 rounded-[16px] px-4 py-3.5 text-sm text-[#3d1f00] placeholder:text-[#d4a07a] outline-none focus:ring-2 focus:ring-orange-300 transition"
            />
            <input
              type="password" placeholder="비밀번호" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className="w-full bg-orange-50/80 border border-orange-100 rounded-[16px] px-4 py-3.5 text-sm text-[#3d1f00] placeholder:text-[#d4a07a] outline-none focus:ring-2 focus:ring-orange-300 transition"
            />

            <label className="flex items-center gap-2.5 cursor-pointer select-none px-1">
              <div
                onClick={() => setKeepLogin(!keepLogin)}
                className={`w-10 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 ${keepLogin ? "bg-gradient-to-r from-orange-400 to-amber-300" : "bg-gray-200"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${keepLogin ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className="text-sm text-[#9d7060] font-medium">로그인 상태 유지</span>
            </label>

            {error && (
              <div className="rounded-[14px] bg-red-50 border border-red-100 px-4 py-3 text-red-500 text-sm font-medium text-center">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="group relative w-full h-14 rounded-[18px] overflow-hidden shadow-[0_10px_30px_rgba(255,160,50,0.4)] active:scale-[0.98] transition-transform disabled:opacity-70">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400" />
              <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.15)_50%,transparent_60%)] animate-[shimmer_3s_infinite]" />
              <span className="relative text-white font-black text-base">
                {loading ? "로그인 중..." : "로그인 💭"}
              </span>
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#b08060] mt-6">
          계정이 없으신가요?{" "}
          <a href="/signup" className="text-orange-500 font-black">회원가입 →</a>
        </p>
      </div>

      <style>{`
        @keyframes floatA { 0%{transform:translate(0,0)} 100%{transform:translate(-30px,40px)} }
        @keyframes floatB { 0%{transform:translate(0,0)} 100%{transform:translate(40px,-30px)} }
        @keyframes floatC { 0%{transform:translate(0,0)} 100%{transform:translate(-20px,25px)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </main>
  );
}
