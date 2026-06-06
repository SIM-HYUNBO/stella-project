"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [birth, setBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("비밀번호가 일치하지 않아요."); return; }
    setLoading(true);
    try {
      const nicknameSnap = await getDocs(query(collection(db, "users"), where("nickname", "==", nickname.trim())));
      if (!nicknameSnap.empty) { setError("이미 사용 중인 닉네임이에요."); setLoading(false); return; }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        email, nickname: nickname.trim(), birth,
        phone: phone.replace(/[^0-9]/g, ""),
        createdAt: serverTimestamp(),
      });
      await updateProfile(user, { displayName: nickname });
      alert(`${nickname}님 회원가입 완료`);
      router.push("/home");
    } catch {
      setError("회원가입 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { type: "text",     placeholder: "닉네임",       value: nickname,         setter: setNickname },
    { type: "email",    placeholder: "이메일",        value: email,            setter: setEmail },
    { type: "password", placeholder: "비밀번호",      value: password,         setter: setPassword },
    { type: "password", placeholder: "비밀번호 확인", value: confirmPassword,  setter: setConfirmPassword },
    { type: "date",     placeholder: "생년월일",      value: birth,            setter: setBirth },
    { type: "tel",      placeholder: "전화번호",      value: phone,            setter: setPhone },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FFFBF0]">
      <div className="fixed inset-0 bg-gradient-to-b from-[#FFFBF0] via-[#FFF8E8] to-[#FFF5DC]" />
      <div className="fixed top-[-100px] right-[-80px] w-[300px] h-[300px] rounded-full bg-amber-200/30 blur-[90px]" />
      <div className="fixed bottom-[-80px] left-[-60px] w-[280px] h-[280px] rounded-full bg-yellow-200/25 blur-[80px]" />

      <div className="relative z-10 min-h-screen flex flex-col justify-center px-5 py-10">

        {/* 브랜드 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-gradient-to-br from-amber-700 to-amber-500 shadow-[0_12px_36px_rgba(120,53,15,0.28)] mb-4">
            <span className="text-4xl">✨</span>
          </div>
          <h1 className="text-4xl font-black tracking-[0.18em] text-stone-800">WAGIE</h1>
          <p className="text-amber-600 text-sm font-medium mt-2">함께라서 더 따뜻해요 🧡</p>
        </div>

        {/* 폼 카드 */}
        <div className="rounded-[28px] bg-white shadow-[0_8px_40px_rgba(120,53,15,0.10)] border border-amber-50 px-6 py-7">
          <p className="font-black text-stone-800 text-xl mb-4">회원가입</p>

          <form onSubmit={handleSignup} className="space-y-3">
            {fields.map(({ type, placeholder, value, setter }) => (
              <input key={placeholder}
                type={type} placeholder={placeholder} value={value}
                onChange={(e) => setter(e.target.value)} required
                className="w-full bg-amber-50 rounded-[16px] px-4 py-3.5 text-sm text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-amber-400 transition border border-amber-100"
              />
            ))}

            {error && (
              <div className="rounded-[14px] bg-red-50 border border-red-100 px-4 py-3 text-red-500 text-sm font-medium text-center">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="relative w-full h-14 rounded-[18px] overflow-hidden bg-gradient-to-r from-amber-700 to-amber-500 shadow-[0_8px_24px_rgba(120,53,15,0.28)] text-white font-black text-base active:scale-[0.98] transition-transform disabled:opacity-70 mt-2">
              <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.13)_50%,transparent_60%)] animate-[shimmer_3s_infinite]" />
              <span className="relative">{loading ? "가입 중..." : "시작하기 🚀"}</span>
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-stone-400 mt-6">
          이미 계정이 있으신가요?{" "}
          <a href="/login" className="text-amber-700 font-black">로그인 →</a>
        </p>
      </div>

      <style>{`
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </main>
  );
}
