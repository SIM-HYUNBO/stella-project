"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { ArrowRight, Mail, LoaderCircle } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { AuthInput, AuthPasswordInput } from "@/components/AuthInput";
import styles from "@/app/welcome.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [keepLogin, setKeepLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
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
      submitting.current = false; setLoading(false);
    }
  };

  return <AuthShell mode="login" title="다시 만나서 반가워요" description="이야기를 이어갈 준비가 됐나요?">
    <form onSubmit={handleLogin} onKeyDown={event => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }} className={styles.form} aria-busy={loading}>
      <AuthInput id="login-email" name="email" label="이메일" type="email" autoComplete="username" placeholder="name@example.com" icon={<Mail size={17} strokeWidth={1.6}/>} value={email} onChange={event => setEmail(event.target.value)} disabled={loading} required />
      <AuthPasswordInput id="login-password" name="password" label="비밀번호" autoComplete="current-password" placeholder="비밀번호를 입력해 주세요" value={password} onChange={event => setPassword(event.target.value)} disabled={loading} required />
      <button type="button" role="switch" aria-checked={keepLogin} disabled={loading} onClick={() => setKeepLogin(value => !value)} className={styles.keepLogin}><span className={styles.switchTrack} data-on={keepLogin}><span/></span>로그인 상태 유지</button>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button type="submit" disabled={loading} className={styles.submit}>{loading ? <><LoaderCircle className={styles.spinner} size={18}/>로그인 중이에요</> : <>로그인<ArrowRight size={18}/></>}</button>
    </form>
    <p className={styles.formBottom}>아직 계정이 없나요?<Link href="/signup">회원가입</Link></p>
  </AuthShell>;
}
