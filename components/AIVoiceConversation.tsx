"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Headphones, Mic, Square, X, Volume2 } from "lucide-react";

export default function AIVoiceConversation({ disabled, name, onSend }: {
  disabled: boolean; name: string; onSend: (text: string) => Promise<string | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const active = useRef(false);
  const recognition = useRef<any>(null);
  const finishListening = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    generation.current++; active.current = false;
    if (speechTimer.current) clearTimeout(speechTimer.current);
    recognition.current?.abort(); recognition.current = null; finishListening.current = null;
    window.speechSynthesis?.cancel(); utterance.current = null;
  };
  useEffect(() => () => { stop(); }, []);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const hide = () => { if (document.hidden) { stop(); setPhase("idle"); } };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide); document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, [open]);
  const playAnswer = (result: string, token: number) => {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") { active.current = false; setPhase("idle"); setError("이 브라우저에서는 답변을 소리로 읽을 수 없어."); return; }
    synth.cancel(); synth.resume();
    setError("");
    const speech = new SpeechSynthesisUtterance(result.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/https?:\/\/\S+/g, "").replace(/[*#_`|]/g, " "));
    utterance.current = speech; speech.lang = "ko-KR"; speech.rate = 1;
    speech.voice = window.speechSynthesis.getVoices().find(voice => voice.lang.startsWith("ko")) || null;
    const done = () => { if (token === generation.current) { active.current = false; setPhase("idle"); utterance.current = null; } };
    speech.onstart = () => { if (speechTimer.current) clearTimeout(speechTimer.current); };
    speech.onend = () => { if (speechTimer.current) clearTimeout(speechTimer.current); done(); };
    speech.onerror = () => { if (speechTimer.current) clearTimeout(speechTimer.current); done(); if (token === generation.current) setError("음성 재생이 막혔어. ‘답변 듣기’를 눌러 줘."); };
    speechTimer.current = setTimeout(() => {
      if (token !== generation.current) return;
      generation.current++; synth.cancel(); active.current = false; setPhase("idle");
      setError("소리가 시작되지 않았어. ‘답변 듣기’를 눌러 다시 재생해 줘.");
    }, 8000);
    setPhase("speaking"); window.speechSynthesis.speak(speech);
  };
  const listen = () => {
    if (active.current || disabled) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || !window.speechSynthesis) { setError("이 브라우저는 음성 대화를 지원하지 않아. 다른 브라우저에서 열어 줘."); return; }
    active.current = true; setError(""); setText("");
    const token = ++generation.current;
    const rec = new SR(); recognition.current = rec;
    rec.lang = "ko-KR"; rec.interimResults = true; rec.continuous = false;
    let finalText = "", latestText = "";
    let submitted = false;
    rec.onresult = (event: any) => {
      if (token !== generation.current || submitted) return;
      let transcript = ""; finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      }
      latestText = transcript; setText(transcript);
    };
    rec.onerror = (event: any) => {
      if (token !== generation.current || submitted) return;
      generation.current++; active.current = false; setPhase("idle");
      setError(event.error === "not-allowed" ? "마이크 사용을 허용해 줘." : event.error === "no-speech" ? "목소리가 들리지 않았어. 다시 말해 줘." : "음성을 듣지 못했어. 연결 상태와 마이크를 확인해 줘.");
    };
    const submit = async () => {
      if (token !== generation.current || submitted) return;
      submitted = true; finishListening.current = null;
      recognition.current = null;
      const question = (latestText || finalText).trim();
      if (!question) { active.current = false; setPhase("idle"); return; }
      setPhase("thinking");
      try {
        const result = await onSend(question);
        if (token !== generation.current) return;
        if (!result) { setError("답변을 받지 못했어. 채팅 화면의 안내도 확인해 줘."); active.current = false; setPhase("idle"); return; }
        setAnswer(result);
        playAnswer(result, token);
      } catch { if (token === generation.current) { active.current = false; setPhase("idle"); setError("음성 대화가 끊겼어. 다시 시도해 줘."); } }
    };
    rec.onend = submit;
    finishListening.current = () => {
      try { rec.stop(); } catch {}
      void submit();
    };
    try { rec.start(); setPhase("listening"); } catch { active.current = false; setPhase("idle"); setError("마이크를 시작하지 못했어. 다시 눌러 줘."); }
  };
  return <>
    <button type="button" title="음성 대화" aria-label="음성 대화" disabled={disabled} onClick={() => { setOpen(true); setError(""); }} className="flex h-9 w-9 items-center justify-center rounded-full text-sky-600 hover:bg-sky-50 disabled:opacity-30"><Headphones size={19} strokeWidth={1.7} /></button>
    {open && createPortal(<div role="dialog" aria-modal="true" aria-label="AI 음성 대화" className="fixed inset-0 z-[99999] flex flex-col bg-gradient-to-b from-sky-50 via-white to-yellow-50 px-6 py-8" onKeyDown={event => {
      if (event.key === "Escape") { stop(); setPhase("idle"); setOpen(false); }
      if (event.key === "Tab") {
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <div className="flex items-center justify-between"><h2 className="font-medium text-slate-700">{name}와 음성 대화</h2><button autoFocus type="button" aria-label="음성 대화 닫기" onClick={() => { stop(); setPhase("idle"); setOpen(false); }} className="rounded-full p-3 text-slate-500"><X size={22} /></button></div>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 overflow-y-auto py-8">
        <div className={`flex h-32 w-32 shrink-0 items-center justify-center rounded-full border border-white bg-sky-100 text-sky-500 shadow-[0_12px_60px_#bae6fd80] ${phase !== "idle" ? "animate-pulse motion-reduce:animate-none" : ""}`}>{phase === "speaking" ? <Volume2 size={45} strokeWidth={1.4} /> : <Mic size={45} strokeWidth={1.4} />}</div>
        <p role="status" className="text-sm text-slate-500">{phase === "listening" ? "듣고 있어. 다 말했으면 ‘말 끝내기’를 눌러 줘." : phase === "thinking" ? "답변을 생각하고 있어…" : phase === "speaking" ? "이야기하고 있어" : "마이크를 누르고 편하게 말해 봐"}</p>
        {text && <p className="w-full rounded-2xl bg-sky-100/70 px-5 py-3 text-sm text-slate-700">{text}</p>}
        {answer && <><p className="w-full whitespace-pre-wrap text-sm leading-7 text-slate-700">{answer}</p><button type="button" disabled={phase !== "idle" || disabled} onClick={() => { active.current = true; playAnswer(answer, ++generation.current); }} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-sky-600 shadow-sm disabled:opacity-40"><Volume2 size={18} />답변 듣기</button></>}
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      </div>
      <div className="flex justify-center pb-6">{phase === "idle" ? <button type="button" disabled={disabled} onClick={listen} className="flex items-center gap-2 rounded-full bg-sky-500 px-7 py-4 text-sm font-medium text-white shadow-lg disabled:opacity-40"><Mic size={20} />말하기</button> : phase === "listening" ? <button type="button" onClick={() => finishListening.current?.()} className="flex items-center gap-2 rounded-full bg-sky-500 px-7 py-4 text-sm font-medium text-white shadow-lg"><Square size={18} />말 끝내기</button> : <button type="button" onClick={() => { stop(); setPhase("idle"); }} className="flex items-center gap-2 rounded-full bg-white px-7 py-4 text-sm text-slate-600 shadow"><Square size={18} />멈추기</button>}</div>
    </div>, document.body)}
  </>;
}
