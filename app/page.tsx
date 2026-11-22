"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AuthScenery from "@/components/AuthScenery";
import { WelcomeBrand } from "@/components/AuthShell";
import styles from "./welcome.module.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import LoadingScreen from "../components/LoadingScreen";

export default function RootPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/home");
      else setReady(true);
    });
    return () => unsub();
  }, [router]);

  if (!ready) {
    return <LoadingScreen />;
  }

  return <div className={styles.page}>
    <header className={styles.header}><WelcomeBrand/><nav className={styles.landingNav} aria-label="시작 메뉴"><Link href="/login">로그인</Link><Link href="/signup" className={styles.smallCta}>와기 시작하기<ArrowRight size={15}/></Link></nav></header>
    <main className={styles.landingMain}>
      <section className={styles.heroCopy}><span className={styles.eyebrow}><span className={styles.blueDot}/>YOUR LITTLE PLACE TO TALK</span><h1>가벼운 안부가,<br/>우리의 <span className={styles.highlight}>하루가 돼.</span></h1><p>친구와 나누는 사소한 이야기부터<br/>함께 남기고 싶은 순간까지, 와기에서.</p><div className={styles.landingActions}><Link href="/signup" className={styles.primary}>와기 시작하기<ArrowRight size={18}/></Link><Link href="/login" className={styles.secondary}>이미 계정이 있어요</Link></div><div className={styles.welcomeNote}><span className={styles.noteDuck}>w</span><span>너의 이야기를 기다리고 있어.</span></div></section>
      <div className={styles.landingArt}><AuthScenery/></div>

    </main>
    <footer className={styles.footer}><span>작은 대화가 시작되는 곳.</span><span>WAGIE · wagging duck</span></footer>
  </div>;
}
