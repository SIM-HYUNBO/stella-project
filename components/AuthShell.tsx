/* eslint-disable @next/next/no-img-element -- Local brand mascot. */
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import AuthScenery from "./AuthScenery";
import styles from "@/app/welcome.module.css";
export function WelcomeBrand() {
  return <Link href="/" className={styles.brand} aria-label="WAGIE 첫 화면"><span className={styles.brandIcon}><img src="/wag.png" alt="" /></span><strong>WAGIE</strong><span className={styles.brandTag}>wagging duck</span></Link>;
}
export default function AuthShell({ mode, title, description, children }: { mode: "login" | "signup"; title: string; description: string; children: ReactNode }) {
  return <div className={styles.page}>
    <header className={styles.header}><WelcomeBrand/><Link className={styles.headerLink} href={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "처음이신가요?" : "이미 계정이 있나요?"}<span>{mode === "login" ? "회원가입" : "로그인"}</span></Link></header>
    <main className={styles.authMain}>
      <aside className={styles.authAside}><span className={styles.eyebrow}>YOUR LITTLE PLACE TO TALK</span><h2>작은 안부 하나로,<br/><span>더 가까워지는 우리.</span></h2><p>별일 없는 하루도, 꼭 전하고 싶은 순간도.<br/>와기에서 편하게 나눠 봐.</p><AuthScenery/></aside>
      <section className={styles.formCard}><Link href="/" className={styles.backLink}><ArrowLeft size={15}/>첫 화면으로</Link><div className={styles.formMascot}><img src="/wag.png" alt="" /></div><span className={styles.formEyebrow}>{mode === "login" ? "WELCOME BACK" : "A NEW LITTLE HELLO"}</span><h1 className={styles.formTitle}>{title}</h1><p className={styles.formDescription}>{description}</p>{children}</section>
    </main>
    <footer className={styles.footer}><span>작은 대화가 시작되는 곳.</span><span>WAGIE · wagging duck</span></footer>
  </div>;
}
