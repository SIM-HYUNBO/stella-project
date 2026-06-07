"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [keepLogin, setKeepLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          nickname: user.displayName || user.email?.split("@")[0] || "유저",
          createdAt: serverTimestamp(),
        });
      }
      router.push("/home");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") setError("구글 로그인에 실패했어요.");
    } finally {
      setLoading(false);
    }
  };

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
      <div className="fixed inset-0 bg-gray-50" />

      <div className="relative z-10 min-h-screen flex flex-col justify-center px-5 py-10">

        {/* 브랜드 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg- mb-4">
            <span className="text-4xl">💬</span>
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
              className="w-full bg-sky-50/80 rounded-[16px] px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-300 transition"
            />
            <input
              type="password" placeholder="비밀번호" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className="w-full bg-sky-50/80 rounded-[16px] px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-300 transition"
            />

            <label className="flex items-center gap-2.5 cursor-pointer select-none px-1">
              <div
                onClick={() => setKeepLogin(!keepLogin)}
                className={`w-10 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 ${keepLogin ? "bg-sky-200" : "bg-gray-200"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-all duration-300 ${keepLogin ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className="text-sm text-[#9d7060] font-medium">로그인 상태 유지</span>
            </label>

            {error && (
              <div className="rounded-[14px] bg-red-50 border border-red-100 px-4 py-3 text-red-500 text-sm font-medium text-center">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="group relative w-full h-14 rounded-[18px] overflow-hidden active:scale-[0.98] transition-transform disabled:opacity-70">
              <div className="absolute inset-0 bg-sky-200" />
              <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.15)_50%,transparent_60%)] animate-[shimmer_3s_infinite]" />
              <span className="relative text-white font-black text-base">
                {loading ? "로그인 중..." : "로그인 💭"}
              </span>
            </button>
          </form>
        </div>

        {/* 소셜 로그인 */}
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">또는</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <button onClick={handleGoogleLogin} disabled={loading}
            className="w-full h-12 rounded-[16px] bg-white border border-slate-200 flex items-center px-4 gap-3 active:scale-[0.98] transition shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <span className="text-sm font-bold text-slate-700">Google로 계속하기</span>
          </button>

          <button onClick={() => alert("네이버 로그인은 준비 중이에요")}
            className="w-full h-12 rounded-[16px] bg-[#03C75A] flex items-center px-4 gap-3 active:scale-[0.98] transition">
            <span className="text-white font-black text-lg leading-none w-5 text-center">N</span>
            <span className="text-sm font-bold text-white">네이버로 계속하기</span>
          </button>

          <button onClick={() => alert("카카오 로그인은 준비 중이에요")}
            className="w-full h-12 rounded-[16px] bg-[#FEE500] flex items-center px-4 gap-3 active:scale-[0.98] transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.7 1.6 5.08 4.02 6.54L5 21l4.23-2.23c.88.2 1.81.3 2.77.3 5.52 0 10-3.48 10-7.8S17.52 3 12 3z"/></svg>
            <span className="text-sm font-bold text-[#3C1E1E]">카카오로 계속하기</span>
          </button>

          <button onClick={() => alert("Apple 로그인은 준비 중이에요")}
            className="w-full h-12 rounded-[16px] bg-black flex items-center px-4 gap-3 active:scale-[0.98] transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.27.06 2.15.72 2.9.73.9-.14 1.75-.8 3.04-.87 1.55.07 2.73.62 3.48 1.63-3.18 1.9-2.39 6.19.58 7.37zM12.9 7.35c-.18-2.31 1.69-4.22 3.83-4.35.25 2.38-2.13 4.35-3.83 4.35z"/></svg>
            <span className="text-sm font-bold text-white">Apple로 계속하기</span>
          </button>
        </div>

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
