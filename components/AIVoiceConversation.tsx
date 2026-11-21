"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Headphones, Mic, MicOff, X, RotateCcw, AudioLines } from "lucide-react";
import AIRateLimit from "./AIRateLimit";
import { AIVoiceSession, VoiceState } from "@/lib/ai-voice-session";
import styles from "./ai-voice.module.css";

export default function AIVoiceConversation({ disabled, name, onSend, retryAt = null }: {
  retryAt?: number | null; disabled: boolean; name: string; onSend: (text: string) => Promise<string | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<VoiceState>({ phase: "paused" });
  const session = useRef<AIVoiceSession | null>(null);
  const latest = useRef({ disabled, onSend });
  latest.current = { disabled, onSend };
  const entry = useRef<HTMLButtonElement>(null);
  const connect = () => {
    if (!session.current) session.current = new AIVoiceSession({
      busy: () => latest.current.disabled,
      send: text => latest.current.onSend(text),
      state: setState,
      createRecognition: () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR || !window.speechSynthesis) throw new Error("unsupported");
        return new SR();
      },
      speak: (text, started, ended, failed) => {
        const synth = window.speechSynthesis;
        synth.cancel(); synth.resume();
        const speech = new SpeechSynthesisUtterance(text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/https?:\/\/\S+/g, "").replace(/[*#_`|]/g, " "));
        speech.lang = "ko-KR"; speech.rate = 1;
        speech.voice = synth.getVoices().find(voice => voice.lang.startsWith("ko")) || null;
        speech.onstart = started; speech.onend = ended; speech.onerror = failed;
        synth.speak(speech);
        return () => { speech.onstart = null; speech.onend = null; speech.onerror = null; synth.cancel(); };
      },
    });
    session.current.start();
  };
  const close = () => { session.current?.stop(); setOpen(false); entry.current?.focus(); };
  useEffect(() => () => session.current?.stop(), []);
  useEffect(() => {
    if (!open) return;
    const entryButton = entry.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const hide = () => { if (document.hidden) session.current?.pause(); };
    document.addEventListener("visibilitychange", hide);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("visibilitychange", hide); entryButton?.focus(); };
  }, [open]);
  const paused = state.phase === "paused" || state.phase === "error";
  const status = state.phase === "listening" ? "편하게 이야기해 줘" : state.phase === "thinking" ? "네 말을 생각하고 있어" : state.phase === "speaking" ? "이야기하고 있어" : state.phase === "error" ? "잠깐, 연결을 확인해 줘" : "잠시 쉬어가는 중";
  return <>
    <button ref={entry} type="button" title="음성 대화" aria-label="음성 대화" disabled={disabled} onClick={() => { setOpen(true); connect(); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sky-600 hover:bg-sky-50 disabled:opacity-30"><Headphones size={19} strokeWidth={1.7} /></button>
    {open && createPortal(<div role="dialog" aria-modal="true" aria-label="AI 음성 대화" className={styles.screen} data-phase={state.phase} onKeyDown={event => {
      if (event.key === "Escape") close();
      if (event.key === "Tab") {
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <header className={styles.header}>
        <div className={styles.brand}><span className={styles.liveDot} /><span>WAGIE <span className={styles.voiceLabel}>VOICE</span></span></div>
        <button autoFocus type="button" aria-label="음성 대화 닫기" onClick={close} className={styles.close}><X size={21} strokeWidth={1.6} /></button>
      </header>
      <main className={styles.main}>
        <p className={styles.eyebrow}>JUST YOU &amp; {name}</p>
        <div className={styles.orbStage} aria-hidden="true">
          <div className={styles.halo} /><div className={styles.ring} />
          <div className={styles.orb}><div className={styles.orbShine} /><AudioLines size={58} strokeWidth={1} className={styles.orbIcon} /></div>
          <div className={styles.orbShadow} />
        </div>
        <h2 className={styles.heading} aria-live="polite">{status}</h2>
        <p className={styles.caption}>{paused ? "준비되면 다시 이어가자" : state.phase === "listening" ? "말이 끝나면 알아서 답할게" : state.phase === "speaking" ? "답변이 끝나면 다시 네 말을 들을게" : "조금만 기다려 줘"}</p>
        <div className={styles.wave} aria-hidden="true">{[0,1,2,3,4,5,6].map(i => <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />)}</div>
      </main>
      <footer className={styles.footer}>
        <AIRateLimit retryAt={retryAt} />
        {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
        <div className={styles.controls}>
          <button type="button" aria-label={paused ? "음성 대화 다시 연결" : "마이크 일시정지"} onClick={() => paused ? connect() : session.current?.pause()} className={styles.mute}>{paused ? <RotateCcw size={22} strokeWidth={1.6} /> : <MicOff size={22} strokeWidth={1.6} />}</button>
          <button type="button" aria-label="음성 대화 종료" onClick={close} className={styles.end}><X size={25} strokeWidth={1.8} /></button>
        </div>
        <p className={styles.privacy}><Mic size={12} />{state.phase === "listening" ? "마이크가 켜져 있어" : state.phase === "speaking" ? "AI가 말하는 동안 마이크는 쉬고 있어" : "마이크 대기 중"}</p>
      </footer>
    </div>, document.body)}
  </>;
}
