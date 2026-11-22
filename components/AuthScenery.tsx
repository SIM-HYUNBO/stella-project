/* eslint-disable @next/next/no-img-element -- Local brand mascot. */
import { Heart, MessageCircle, Sparkles } from "lucide-react";
import styles from "@/app/welcome.module.css";
export default function AuthScenery() {
  return <div className={styles.scenery} aria-hidden="true">
    <div className={styles.sceneHalo} /><div className={styles.sceneRing} />
    <div className={styles.backCard} /><div className={styles.middleCard} />
    <div className={styles.mascotCard}><span className={styles.cardDots}><i/><i/><i/></span><div className={styles.duckOrb}><img src="/wag.png" alt="" /></div><span className={styles.mascotCaption}>a little hello, a lot of happiness.</span></div>
    <div className={styles.helloBubble}><MessageCircle size={18} strokeWidth={1.6} /><span>오늘도, 반가워!</span></div>
    <div className={styles.replyBubble}><span>같이 이야기할래?</span><span className={styles.bubbleDots}><i/><i/><i/></span></div>
    <span className={styles.heartCharm}><Heart size={21} strokeWidth={1.5}/></span><span className={styles.sparkCharm}><Sparkles size={24} strokeWidth={1.5}/></span>
  </div>;
}
