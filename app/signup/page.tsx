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
    { type: "text",     placeholder: "닉네임",      value: nickname,         setter: setNickname },
    { type: "email",    placeholder: "이메일",       value: email,            setter: setEmail },
    { type: "password", placeholder: "비밀번호",     value: password,         setter: setPassword },
    { type: "password", placeholder: "비밀번호 확인", value: confirmPassword,  setter: setConfirmPassword },
    { type: "date",     placeholder: "생년월일",      value: birth,            setter: setBirth },
    { type: "tel",      placeholder: "전화번호",      value: phone,            setter: setPhone },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-yellow-50" />

      <div className="relative z-10 min-h-screen flex flex-col justify-center px-5 py-10">

        {/* 브랜드 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-sky-100-[0_16px_40px_rgba(14,165,233,0.45)] mb-4">
            <span className="text-4xl">✨</span>
          </div>
          <h1 className="text-4xl font-black tracking-[0.18em] text-sky-400">WAGIE</h1>
          <p className="text-[#b07848] text-sm font-medium mt-2">함께라서 더 따뜻해요 🧡</p>
        </div>

        {/* 폼 카드 */}
        <div className="rounded-[28px] bg-white/80 backdrop-blur-md  px-6 py-7">
          <p className="font-black text-[gray-800] text-xl mb-4">회원가입</p>

          <form onSubmit={handleSignup} className="space-y-3">
            {fields.map(({ type, placeholder, value, setter }) => (
              <input key={placeholder}
                type={type} placeholder={placeholder} value={value}
                onChange={(e) => setter(e.target.value)} required
                className="w-full bg-sky-50/80  rounded-[16px] px-4 py-3.5 text-sm text-[gray-800] placeholder:text-[sky-400] outline-none focus:ring-2 focus:ring-sky-200 transition"
              />
            ))}

            {error && (
              <div className="rounded-[14px] bg-red-50  px-4 py-3 text-red-500 text-sm font-medium text-center">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="group relative w-full h-14 rounded-[18px] overflow-hidden-[0_10px_30px_rgba(14,165,233,0.4)] active:scale-[0.98] transition-transform disabled:opacity-70 mt-2">
              <div className="absolute inset-0 bg-sky-100" />
              <div className="absolute inset-0  animate-[shimmer_3s_infinite]" />
              <span className="relative text-white font-black text-base">
                {loading ? "가입 중..." : "시작하기 🚀"}
              </span>
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#b08060] mt-6">
          이미 계정이 있으신가요?{" "}
          <a href="/login" className="text-sky-400 font-black">로그인 →</a>
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
