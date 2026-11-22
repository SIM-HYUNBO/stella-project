"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Hash, LockKeyhole, Scissors, Zap } from "lucide-react";
import { SECRET_GAMES, pickSecretGames, makeSecretQuestion, SecretGameId } from "@/lib/secret-games";
import styles from "./secret.module.css";

type Phase = "blank" | "greeting" | "failed" | "reveal" | "menu" | "buttonsOut" | "titleOut" | "returning" | "game";
type Game = SecretGameId;
const ICONS = [Zap, Hash, Scissors];
const COLORS = ["#b5f5c8", "#b8d7ff", "#e3c7ff"];

export default function LockedPage() {
  const router = useRouter();
  const [games, setGames] = useState<ReturnType<typeof pickSecretGames>>([]);
  const [phase, setPhase] = useState<Phase>("blank");
  const [game, setGame] = useState<Game | null>(null);
  const admitted = useRef<boolean | null>(null);
  const chosen = useRef(false);
  const deadline = useRef(0);
  useEffect(() => {
    if (admitted.current === null) {
      admitted.current = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 < .2;
      if (admitted.current) setGames(pickSecretGames());
    }
    const timers: number[] = [];
    const at = (ms: number, value: Phase) => timers.push(window.setTimeout(() => setPhase(value), ms));
    at(800, admitted.current ? "greeting" : "failed");
    if (admitted.current) { at(1800, "reveal"); at(2400, "menu"); }
    else at(2400, "blank");
    return () => timers.forEach(window.clearTimeout);
  }, []);
  useEffect(() => {
    if (phase !== "menu") return;
    deadline.current = performance.now() + 5000;
    const timer = window.setTimeout(() => { if (!chosen.current) setPhase("buttonsOut"); }, 5000);
    return () => window.clearTimeout(timer);
  }, [phase]);
  useEffect(() => {
    const next = phase === "buttonsOut" ? { delay: 350, value: "titleOut" as const } : phase === "titleOut" ? { delay: 400, value: "returning" as const } : phase === "returning" ? { delay: 750, value: "blank" as const } : null;
    if (!next) return;
    const timer = window.setTimeout(() => setPhase(next.value), next.delay);
    return () => window.clearTimeout(timer);
  }, [phase]);
  const dark = ["reveal", "menu", "buttonsOut", "titleOut", "game"].includes(phase);
  const choose = (value: Game) => {
    if (phase !== "menu" || chosen.current || performance.now() >= deadline.current) return;
    chosen.current = true; setGame(value); setPhase("game");
  };
  return <main aria-label="비밀 페이지" className={`${styles.screen} ${dark ? styles.dark : ""}`}>
    <div className={styles.halo} aria-hidden="true" />
    <p role="status" className={`${styles.greeting} ${phase === "greeting" || phase === "failed" ? styles.greetingVisible : ""}`}>{phase === "greeting" ? "쉿! 비밀 화면 진입 성공!" : phase === "failed" ? "다음 기회에..." : ""}</p>
    <button type="button" className={styles.back} aria-label="뒤로가기" onClick={() => router.back()}><ArrowLeft size={20} /></button>
    {["reveal", "menu", "buttonsOut", "titleOut"].includes(phase) && <section className={`${styles.menu} ${phase === "titleOut" ? styles.titleOut : ""}`}>
      <div className={styles.intro}><span className={styles.tag}><LockKeyhole size={12} />WAGIE AFTER HOURS</span><h1>게임 선택<span>.</span></h1><p>비밀은 오래 기다리지 않아.</p></div>
      <div className={`${styles.games} ${phase === "menu" ? styles.gamesVisible : ""}`}>
        {games.map(({ id, label, sub }, i) => { const Icon = ICONS[i], color = COLORS[i]; return <button type="button" disabled={phase !== "menu"} onClick={() => choose(id)} key={id} className={styles.gameCard} style={{ color }}><span className={styles.cardTop}><Icon size={25} strokeWidth={1.5} /><small>0{i + 1}</small></span><strong>{label}</strong><small>{sub}</small><ArrowUpRight className={styles.arrow} size={18} /></button>; })}
        {phase === "menu" && <div className={styles.countdown} aria-label="5초 안에 선택"><span /></div>}
      </div>
    </section>}
    {phase === "game" && game && <SecretGame game={game} onExit={() => { setGame(null); setPhase("returning"); }} />}
  </main>;
}

function SecretGame({ game, onExit }: { game: Game; onExit: () => void }) {
  const [result, setResult] = useState("");
  const [reaction, setReaction] = useState<"idle" | "waiting" | "ready">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyAt = useRef(0);
  const state = useRef(reaction);
  const [guess, setGuess] = useState("");
  const [target] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [attempts, setAttempts] = useState(0);
  const [won, setWon] = useState(false);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const tap = () => {
    if (state.current === "waiting") { if (timer.current) clearTimeout(timer.current); setResult("너무 빨랐어! 다시 도전해 봐."); state.current = "idle"; setReaction("idle"); }
    else if (state.current === "ready") { setResult(`${Math.round(performance.now() - readyAt.current)} ms!`); state.current = "idle"; setReaction("idle"); }
    else { setResult(""); setReaction("waiting"); state.current = "waiting"; timer.current = setTimeout(() => { readyAt.current = performance.now(); state.current = "ready"; setReaction("ready"); }, 1500 + Math.random() * 2500); }
  };
  return <section className={styles.playArea}><span className={styles.tag}>YOUR SECRET GAME</span><h1>{SECRET_GAMES.find(g => g.id === game)?.label}</h1>
    {game === "reaction" && <button type="button" className={`${styles.reaction} ${reaction === "ready" ? styles.ready : ""}`} onClick={tap}>{reaction === "waiting" ? "기다려…" : reaction === "ready" ? "지금!" : "터치해서 시작"}</button>}
    {game === "number" && <form className={styles.guessForm} onSubmit={e => { e.preventDefault(); const n = Number(guess); if (!Number.isInteger(n) || n < 1 || n > 100 || won) return; setAttempts(a => a + 1); setWon(n === target); setResult(n === target ? `${attempts + 1}번 만에 정답!` : n < target ? "더 큰 숫자야 ↑" : "더 작은 숫자야 ↓"); setGuess(""); }}><label htmlFor="secret-number">1부터 100 사이, 어떤 숫자일까?</label><div><input id="secret-number" type="number" min="1" max="100" required inputMode="numeric" value={guess} disabled={won} onChange={e => setGuess(e.target.value)} /><button type="submit" disabled={won}>확인</button></div></form>}
    {game === "rps" && <div className={styles.rps}>{["가위", "바위", "보"].map((label, index) => <button type="button" key={label} onClick={() => { const other = Math.floor(Math.random() * 3), outcome = (index - other + 3) % 3; setResult(`상대는 ${["가위", "바위", "보"][other]}! ${outcome === 0 ? "비겼어." : outcome === 1 ? "이겼어!" : "아쉽게 졌어."}`); }}>{label}</button>)}</div>}
    {!["reaction", "number", "rps"].includes(game) && <QuizGame id={game} />}
    <p className={styles.result} role="status">{result}</p><button type="button" className={styles.exit} onClick={onExit}>비밀방 나가기</button>
  </section>;
}

function QuizGame({ id }: { id: SecretGameId }) {
  const [question, setQuestion] = useState(() => makeSecretQuestion(id));
  const [revealed, setRevealed] = useState(!question.preview);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const answered = useRef(false);
  useEffect(() => {
    setRevealed(!question.preview);
    if (!question.preview) return;
    const timer = window.setTimeout(() => setRevealed(true), 1500);
    return () => window.clearTimeout(timer);
  }, [question]);
  return <div className={styles.quiz}>
    <p className={styles.quizMeta}>{round}번째 도전 · {score}점</p>
    <p className={styles.question} style={question.color ? { color: question.color } : undefined}>{!revealed ? question.preview : question.color ? `글자의 색은? ${question.prompt}` : question.prompt}</p>
    <div className={styles.answers}>{question.choices.map(value => <button type="button" key={value} disabled={!revealed || selected !== null} onClick={() => { if (answered.current) return; answered.current = true; setSelected(value); if (value === question.answer) setScore(s => s + 1); }}>{value}</button>)}</div>
    {selected !== null && <><p role="status" className={styles.result}>{selected === question.answer ? "정답!" : `아쉬워! 정답은 ${question.answer}`}</p><button type="button" className={styles.next} onClick={() => { answered.current = false; setSelected(null); setRound(r => r + 1); setQuestion(makeSecretQuestion(id)); }}>다음 도전 →</button></>}
  </div>;
}
