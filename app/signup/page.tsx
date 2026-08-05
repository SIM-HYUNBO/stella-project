"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { saveFCMToken } from "../hooks/usePushSubscription";

const STEPS = ["섹션 선택", "기본 정보", "연락처", "약관"];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [section, setSection] = useState<"chat" | "creative" | null>(null);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nextStep = async () => {
    setError("");
    if (step === 1) {
      if (!section) { setError("섹션을 선택해주세요."); return; }
    }
    if (step === 2) {
      if (nickname.trim().length < 2) { setError("닉네임은 2자 이상이어야 해요."); return; }
      if (!email) { setError("이메일을 입력해주세요."); return; }
      if (password.length < 6) { setError("비밀번호는 6자 이상이어야 해요."); return; }
      if (password !== confirmPassword) { setError("비밀번호가 일치하지 않아요."); return; }
      try {
        const nickSnap = await getDocs(query(collection(db, "users"), where("nickname", "==", nickname.trim())));
        if (!nickSnap.empty) { setError("이미 사용 중인 닉네임이에요."); return; }
      } catch {}
    }
    if (step === 3) {
      if (!birthdate) { setError("생년월일을 입력해주세요."); return; }
      if (phone.replace(/\D/g, "").length < 10) { setError("올바른 전화번호를 입력해주세요."); return; }
    }
    setStep((s) => s + 1);
  };

  const handleSignup = async () => {
    if (!agreed) return setError("약관에 동의해주세요.");
    setError("");
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        nickname: nickname.trim(),
        birthdate,
        phone: phone.replace(/\D/g, ""),
        section: section ?? "chat",
        createdAt: serverTimestamp(),
      });
      try {
        if ("serviceWorker" in navigator && "PushManager" in window) {
          const permission = await Notification.requestPermission();
          if (permission === "granted") await saveFCMToken(nickname.trim());
        }
      } catch {}
      router.push(section === "creative" ? "/creative" : "/home");
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
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">

      {/* 브랜드 */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center">
          <img src="/wag.png" alt="logo" className="w-5 h-5 object-contain" />
        </div>
        <span className="text-sky-500 font-black text-xl tracking-widest">WAGIE</span>
      </div>

      <div className="w-full max-w-2xl">
        {/* 스텝 인디케이터 */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={n} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    done ? "bg-sky-400 text-white" : active ? "bg-sky-400 text-white" : "bg-white border-2 border-gray-200 text-gray-400"
                  }`}>
                    {done ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : n}
                  </div>
                  <span className={`text-sm font-semibold ${active ? "text-slate-800" : "text-gray-400"}`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-4 h-px bg-gray-200" />
                )}
              </div>
            );
          })}
        </div>

        {/* 카드 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {/* Step 1 - 섹션 선택 */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-slate-500 text-sm mb-6">WAGIE에서 어떤 활동을 주로 하실 건가요?<br/>나중에 언제든 전환할 수 있어요.</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSection("chat")}
                  className={`rounded-2xl border-2 p-6 flex flex-col items-center gap-3 transition-all active:scale-95 ${
                    section === "chat" ? "border-sky-400 bg-sky-50" : "border-gray-200 bg-white hover:border-sky-200"
                  }`}
                >
                  <span className="text-4xl">💬</span>
                  <div className="text-center">
                    <p className="font-black text-slate-800">채팅</p>
                    <p className="text-xs text-slate-400 mt-1">친구, 단체채팅, 회의방</p>
                  </div>
                  {section === "chat" && (
                    <div className="w-5 h-5 rounded-full bg-sky-400 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setSection("creative")}
                  className={`rounded-2xl border-2 p-6 flex flex-col items-center gap-3 transition-all active:scale-95 ${
                    section === "creative" ? "border-purple-400 bg-purple-50" : "border-gray-200 bg-white hover:border-purple-200"
                  }`}
                >
                  <span className="text-4xl">🎨</span>
                  <div className="text-center">
                    <p className="font-black text-slate-800">창작</p>
                    <p className="text-xs text-slate-400 mt-1">글, 그림, 일기</p>
                  </div>
                  {section === "creative" && (
                    <div className="w-5 h-5 rounded-full bg-purple-400 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2 - 기본 정보 */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">닉네임</label>
                <input type="text" placeholder="2자 이상" value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-400 transition placeholder:text-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">비밀번호</label>
                <input type="password" placeholder="6자 이상" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-400 transition placeholder:text-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">이메일</label>
                <input type="email" placeholder="name@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-400 transition placeholder:text-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">비밀번호 확인</label>
                <input type="password" placeholder="비밀번호 재입력" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-400 transition placeholder:text-gray-300" />
              </div>
            </div>
          )}

          {/* Step 3 - 연락처 */}
          {step === 3 && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">생년월일</label>
                <input type="date" value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-400 transition text-slate-700" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">전화번호</label>
                <input type="tel" placeholder="010-1234-5678" value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-400 transition placeholder:text-gray-300" />
              </div>
            </div>
          )}

          {/* Step 4 - 약관 */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="bg-gray-50 rounded-xl p-5">
                <p className="font-bold text-slate-800 mb-1.5">모든 기능 무료 제공</p>
                <p className="text-slate-500 text-sm leading-relaxed">채팅, 다이어리, AI 어시스턴트, 회의방 등을 제한 없이 사용할 수 있어요.</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                  className="w-4 h-4 rounded accent-sky-400" />
                <span className="text-sm text-slate-600">WAGIE 이용 약관과 개인정보 처리 안내를 확인했어요.</span>
              </label>
            </div>
          )}

          {error && (
            <p className="mt-4 text-red-500 text-sm font-medium">{error}</p>
          )}

          {/* 버튼 */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => { setError(""); setStep((s) => s - 1); }}
              disabled={step === 1}
              className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-slate-600 hover:bg-gray-50 transition disabled:opacity-30"
            >
              이전
            </button>
            {step < 4 ? (
              <button onClick={nextStep}
                className="px-8 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-500 text-white text-sm font-bold transition active:scale-95">
                다음
              </button>
            ) : (
              <button onClick={handleSignup} disabled={loading}
                className="px-8 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-500 text-white text-sm font-bold transition active:scale-95 disabled:opacity-60">
                {loading ? "가입 중..." : "가입 완료"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-slate-400 mt-6">
          이미 계정이 있어요?{" "}
          <Link href="/login" className="text-sky-500 font-bold">로그인</Link>
        </p>
      </div>
    </main>
  );
}
