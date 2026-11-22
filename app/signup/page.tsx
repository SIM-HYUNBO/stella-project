"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, type User } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { saveFCMToken } from "../hooks/usePushSubscription";
import { ArrowRight, Check, Mail, UserRound, Phone, CalendarDays, ShieldCheck, LoaderCircle } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { AuthInput, AuthPasswordInput } from "@/components/AuthInput";
import styles from "@/app/welcome.module.css";

const STEPS = ["기본 정보", "연락처", "약관"];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pendingUser = useRef<User | null>(null);
  const advanceLock = useRef(false);
  const signupLock = useRef(false);
  const [checking, setChecking] = useState(false);

  const nextStep = async () => {
    if (advanceLock.current || step >= 3) return;
    advanceLock.current = true; setChecking(true); setError("");
    try {
    if (step === 1) {
      if (nickname.trim().length < 2) { setError("닉네임은 2자 이상이어야 해요."); return; }
      if (nickname.trim().length > 30 || /[\/\x00-\x1f]/.test(nickname)) { setError("닉네임은 30자 이내로, 슬래시 없이 입력해 줘."); return; }
      if (!email) { setError("이메일을 입력해주세요."); return; }
      if (password.length < 6) { setError("비밀번호는 6자 이상이어야 해요."); return; }
      if (password !== confirmPassword) { setError("비밀번호가 일치하지 않아요."); return; }
      try {
        const nickSnap = await getDocs(query(collection(db, "users"), where("nickname", "==", nickname.trim())));
        if (!nickSnap.empty) { setError("이미 사용 중인 닉네임이에요."); return; }
      } catch {}
    }
    if (step === 2) {
      if (!birthdate) { setError("생년월일을 입력해주세요."); return; }
      if (phone.replace(/\D/g, "").length < 10) { setError("올바른 전화번호를 입력해주세요."); return; }
    }
    setStep((s) => Math.min(3, s + 1));
    } finally { advanceLock.current = false; setChecking(false); }
  };

  const handleSignup = async () => {
    if (signupLock.current) return;
    if (!agreed) return setError("약관에 동의해주세요.");
    signupLock.current = true;
    setError("");
    setLoading(true);
    try {
      const user = pendingUser.current || (await createUserWithEmailAndPassword(auth, email, password)).user;
      pendingUser.current = user;
      const response = await fetch("/api/signup-profile", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ nickname, birthdate, phone: phone.replace(/\D/g, "") }),
      });
      if (!response.ok) {
        if (response.status === 409) { await user.delete(); pendingUser.current = null; setStep(1); }
        throw Error((await response.json()).error || "가입을 마치지 못했어.");
      }
      pendingUser.current = null;
      try {
        if ("serviceWorker" in navigator && "PushManager" in window) {
          const permission = await Notification.requestPermission();
          if (permission === "granted") await saveFCMToken(nickname.trim());
        }
      } catch {}
      router.replace("/home");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") setError("이미 사용 중인 이메일이에요.");
      else if (err.code === "auth/invalid-email") setError("올바른 이메일 형식이 아니에요.");
      else if (err.code === "auth/weak-password") setError("비밀번호가 너무 약해요.");
      else setError(`회원가입 실패: ${err.code || err.message}`);
    } finally {
      signupLock.current = false; setLoading(false);
    }
  };

  return <AuthShell mode="signup" title={step === 1 ? "우리, 와기에서 만나요" : step === 2 ? "조금 더 알려 주세요" : "이제 거의 다 됐어요"} description={step === 1 ? "작은 안부를 나눌 나만의 계정을 만들어요." : step === 2 ? "친구들과 연결될 정보를 입력해 주세요." : "아래 내용을 확인하면 바로 시작할 수 있어요."}>
    <ol className={styles.steps} aria-label="회원가입 진행 단계">{STEPS.map((label,index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined} data-active={step >= index + 1}><span>{step > index + 1 ? <Check size={13} strokeWidth={2}/> : index + 1}</span><span>{label}</span></li>)}</ol>
    <form className={styles.form} onKeyDown={event => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }} aria-busy={loading || checking} onSubmit={event => { event.preventDefault(); if (step === 3) void handleSignup(); else void nextStep(); }}>
      {step === 1 && <>
        <AuthInput id="signup-nickname" name="nickname" label="닉네임" type="text" autoComplete="nickname" maxLength={30} placeholder="친구들이 불러 줄 이름" icon={<UserRound size={17} strokeWidth={1.6}/>} value={nickname} onChange={event => setNickname(event.target.value)} disabled={loading || checking} required />
        <AuthInput id="signup-email" name="email" label="이메일" type="email" autoComplete="email" placeholder="name@example.com" icon={<Mail size={17} strokeWidth={1.6}/>} value={email} onChange={event => setEmail(event.target.value)} disabled={loading || checking} required />
        <AuthPasswordInput id="signup-password" name="new-password" label="비밀번호" autoComplete="new-password" minLength={6} placeholder="6자 이상 입력해 주세요" value={password} onChange={event => setPassword(event.target.value)} disabled={loading || checking} required />
        <AuthPasswordInput id="signup-confirm-password" name="confirm-password" label="비밀번호 확인" autoComplete="new-password" placeholder="비밀번호를 한 번 더 입력해 주세요" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} disabled={loading || checking} required />
      </>}
      {step === 2 && <><AuthInput id="signup-birthdate" name="birthdate" label="생년월일" type="date" icon={<CalendarDays size={17} strokeWidth={1.6}/>} value={birthdate} onChange={event => setBirthdate(event.target.value)} disabled={loading || checking} required /><AuthInput id="signup-phone" name="phone" label="전화번호" type="tel" autoComplete="tel" inputMode="tel" placeholder="010-1234-5678" icon={<Phone size={17} strokeWidth={1.6}/>} value={phone} onChange={event => setPhone(event.target.value)} disabled={loading || checking} required /><p className={styles.fieldHint}>전화번호는 숫자만 입력해도 괜찮아요.</p></>}
      {step === 3 && <><div className={styles.agreementCard}><span className={styles.agreementIcon}><ShieldCheck size={24} strokeWidth={1.5}/></span><h2>서로를 배려하는 대화의 시작</h2><p>개인정보는 소중하게, 대화는 따뜻하게.<br/>와기 이용 약관과 개인정보 처리 안내를 확인해 주세요.</p></div><label className={styles.agreement}><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} disabled={loading} required/><span>WAGIE 이용 약관과 개인정보 처리 안내를 확인했어요.</span></label></>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.signupActions}>{step > 1 && <button type="button" disabled={loading || checking} className={styles.previous} onClick={() => { setError(""); setStep(value => value - 1); }}>이전</button>}<button type="submit" disabled={loading || checking} className={styles.submit}>{loading || checking ? <><LoaderCircle className={styles.spinner} size={18}/>{loading ? "가입하고 있어요" : "확인하고 있어요"}</> : <>{step === 3 ? "와기 시작하기" : "다음으로"}<ArrowRight size={18}/></>}</button></div>
    </form>
    <p className={styles.formBottom}>이미 계정이 있나요?<Link href="/login">로그인</Link></p>
  </AuthShell>;
}
