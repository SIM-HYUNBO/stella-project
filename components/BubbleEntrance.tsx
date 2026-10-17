"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { bubbleEffect } from "@/lib/bubble-effects";
import styles from "./BubbleEntrance.module.css";

export default function BubbleEntrance({ effect, isMine, messageId, children }: { effect?: string; isMine: boolean; messageId: string; children: ReactNode }) {
  const selected = bubbleEffect(effect);
  const container = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"waiting" | "playing" | "done">("waiting");
  const played = useRef(false);
  useEffect(() => {
    if (selected === "none" || played.current || !container.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { played.current = true; setPhase("done"); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        played.current = true; setPhase("playing"); observer.disconnect();
      }
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [selected, messageId]);
  if (selected === "none") return <>{children}</>;
  return <div ref={container} className={`${styles.entrance} ${isMine ? styles.own : ""} ${phase === "waiting" ? styles.waiting : phase === "playing" ? styles[selected] : ""}`}
    onAnimationEnd={event => { if (event.target === event.currentTarget) setPhase("done"); }}>
    {children}
  </div>;
}
