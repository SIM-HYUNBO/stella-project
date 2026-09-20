"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import PageContainer from "@/components/PageContainer";
import LoadingScreen from "@/components/LoadingScreen";
import LetterComposer from "@/components/LetterComposer";
import { EMPTY_ROOM, MAX_WALL_PINS, STICKERS, WALLS, nextLetterPosition, type Mail, type Room } from "@/lib/room";

type Friend = { uid: string; nickname: string };
async function request(body?: unknown) {
  const user = auth.currentUser;
  if (!user) throw new Error("다시 로그인해 줘.");
  const token = await user.getIdToken();
  const response = await fetch("/api/room", { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "연결을 확인하고 다시 시도해 줘.");
  return data;
}
const date = (ms: number) => new Date(ms).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function Envelope({ open = false }: { open?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 160 115" className={`w-full drop-shadow-md ${open ? "letter-opening" : ""}`}>
    <rect x="5" y="14" width="150" height="95" rx="9" fill="#ead5c0" />
    <path d="M8 22 80 74 152 22" fill="#fff4e5" stroke="#dbbda1" strokeWidth="2" />
    <path d="M8 106 60 66M152 106 100 66" fill="none" stroke="#dbbda1" strokeWidth="2" />
    <circle cx="80" cy="69" r="13" fill="#c8858b" /><path d="M73 68q0-7 7-2 7-5 7 2 0 5-7 9-7-4-7-9" fill="#ffe9e9" />
  </svg>;
}

export default function MyRoom() {
  const router = useRouter();
  const [uid, setUid] = useState("");
  const currentUid = useRef("");
  const [nickname, setNickname] = useState("나");
  const [room, setRoom] = useState<Room>(EMPTY_ROOM);
  const saved = useRef<Room>(EMPTY_ROOM);
  const [mail, setMail] = useState<Mail[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [composing, setComposing] = useState(false);
  const [opened, setOpened] = useState<Mail | null>(null);
  const [opening, setOpening] = useState("");
  const [now, setNow] = useState(Date.now());
  const stage = useRef<HTMLDivElement>(null);
  const mailbox = useRef<HTMLElement>(null);
  const drag = useRef<{ id: string; pointer: number; x: number; y: number; startX: number; startY: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyOpening = useRef(false);
  const refresh = useCallback(async (initial: boolean, expected: string) => {
    try {
      const data = await request();
      if (currentUid.current !== expected) return;
      setNickname(data.nickname); setFriends(data.friends); setMail(data.mail); setError("");
      if (initial) {
        const pins = (data.room.pins as Room["pins"]).reduce<Room["pins"]>((placed, pin) => {
          const overlaps = placed.some(p => p.x === pin.x && p.y === pin.y);
          return [...placed, overlaps ? { ...pin, ...nextLetterPosition(placed) } : pin];
        }, []);
        const layout = { ...data.room, pins };
        setRoom(layout); saved.current = layout;
      }
      setReady(true);
    } catch (e) { if (currentUid.current === expected) setError(e instanceof Error ? e.message : "방을 불러오지 못했어."); }
  }, []);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      currentUid.current = user?.uid || ""; setUid(user?.uid || ""); setReady(false); setMail([]); setRoom(EMPTY_ROOM); setOpened(null); setComposing(false); setEditing(false);
      if (!user) { router.replace("/login"); return; }
      void refresh(true, user.uid);
    });
    return () => { currentUid.current = ""; unsub(); if (timer.current) clearTimeout(timer.current); };
  }, [router, refresh]);
  useEffect(() => {
    if (!uid) return;
    const tick = setInterval(() => { setNow(Date.now()); if (document.visibilityState === "visible") void refresh(false, uid); }, 30000);
    return () => clearInterval(tick);
  }, [uid, refresh]);
  useEffect(() => {
    if (!opened && !composing && !opening) return;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    const focusBefore = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[data-room-dialog]');
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []);
    focusable()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusable();
      if (!items.length) { e.preventDefault(); return; }
      if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === items[items.length - 1]) { e.preventDefault(); items[0].focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", trap); focusBefore?.focus(); };
  }, [opened, composing, opening]);

  const changePosition = (id: string, x: number, y: number) => {
    const clamp = (n: number) => Math.max(8, Math.min(92, n));
    setRoom(r => ({ ...r, decorations: r.decorations.map(d => d.id === id ? { ...d, x: clamp(x), y: clamp(y) } : d), pins: r.pins.map(p => p.id === id ? { ...p, x: clamp(x), y: clamp(y) } : p) }));
  };
  const startDrag = (e: React.PointerEvent<HTMLButtonElement>, item: { id: string; x: number; y: number }) => {
    if (!editing || saving || !e.isPrimary) return;
    setSelected(item.id); e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { ...item, pointer: e.pointerId, startX: e.clientX, startY: e.clientY };
  };
  const moveDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current, r = stage.current?.getBoundingClientRect();
    if (!d || !r || d.pointer !== e.pointerId) return;
    changePosition(d.id, d.x + (e.clientX - d.startX) / r.width * 100, d.y + (e.clientY - d.startY) / r.height * 100);
  };
  const keyboardMove = (e: React.KeyboardEvent<HTMLButtonElement>, item: { id: string; x: number; y: number }) => {
    if (!editing || saving || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault(); changePosition(item.id, item.x + (e.key === "ArrowRight" ? 2 : e.key === "ArrowLeft" ? -2 : 0), item.y + (e.key === "ArrowDown" ? 2 : e.key === "ArrowUp" ? -2 : 0));
  };
  const saveRoom = async () => {
    if (saving) return;
    setSaving(true); setError("");
    const expected = uid;
    try { await request({ action: "saveRoom", room }); if (currentUid.current !== expected) return; saved.current = room; setEditing(false); setSelected(""); setNotice("방 꾸미기를 저장했어."); }
    catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했어."); }
    finally { setSaving(false); }
  };
  const openLetter = async (m: Mail) => {
    if (busyOpening.current) return;
    busyOpening.current = true; setError("");
    const expected = uid;
    try {
      const { letter } = await request({ action: "open", id: m.id });
      if (currentUid.current !== expected) return;
      setMail(list => list.map(item => item.id === m.id ? letter : item));
      if (m.opened) setOpened(letter);
      else { setOpening(m.id); timer.current = setTimeout(() => { if (currentUid.current !== expected) return; setOpening(""); setOpened(letter); }, 650); }
    } catch (e) { setError(e instanceof Error ? e.message : "편지를 열지 못했어."); }
    finally { busyOpening.current = false; }
  };
  const pin = (m: Mail) => {
    if (room.pins.some(p => p.id === m.id)) { setOpened(null); return; }
    if (room.pins.length >= MAX_WALL_PINS) { setNotice(`벽에는 편지를 ${MAX_WALL_PINS}개까지 붙일 수 있어. 기존 편지를 치우고 다시 붙여 봐.`); setOpened(null); return; }
    setRoom(r => ({ ...r, pins: [...r.pins, { id: m.id, ...nextLetterPosition(r.pins) }] }));
    setSelected(m.id); setEditing(true); setOpened(null); stage.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const addDecoration = (emoji: string) => {
    if (room.pins.length + room.decorations.length >= 20) { setNotice("소품과 편지는 총 20개까지 놓을 수 있어."); return; }
    const id = crypto.randomUUID(); setRoom(r => ({ ...r, decorations: [...r.decorations, { id, emoji, x: 50, y: 48 }] })); setSelected(id);
  };
  if (!ready && !error) return <PageContainer><LoadingScreen /></PageContainer>;
  return <PageContainer>
    <div className="mx-auto max-w-2xl pb-8 text-[#66544e]">
      <header className="mb-5 flex items-center justify-between gap-3 px-1 pt-3">
        <div><p className="text-[10px] font-bold tracking-[.22em] text-[#b49483]">A LITTLE PLACE FOR YOU</p><h1 className="mt-1 text-2xl font-bold">{nickname}의 방</h1></div>
        <button disabled={!ready} onClick={() => mailbox.current?.scrollIntoView({ behavior: "smooth", block: "center" })} className="relative rounded-2xl bg-white px-4 py-3 text-sm shadow-sm">💌 우편함{mail.some(m => !m.opened) && <span className="absolute -right-1 -top-1 rounded-full bg-[#c68289] px-1.5 text-xs text-white">{mail.filter(m => !m.opened).length}</span>}</button>
      </header>
      {error && <div role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error} <button onClick={() => void refresh(!ready, uid)} className="underline">다시 불러오기</button></div>}
      <div ref={stage} className="relative aspect-[5/4] overflow-hidden rounded-[28px] border-[6px] border-white shadow-[0_15px_45px_#8b70651a]" style={{ background: room.wall }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 bottom-0 h-[27%] border-t-8 border-[#dac8b7]" style={{ background: "repeating-linear-gradient(90deg,#e3cfb8 0,#e3cfb8 70px,#d8bea2 71px,#e3cfb8 73px)" }} />
          <div className="absolute left-[10%] top-[12%] h-[32%] w-[25%] rounded-t-[40px] border-[7px] border-white bg-gradient-to-b from-[#badcea] to-[#fff8dc] shadow-md"><div className="absolute left-1/2 h-full w-1 bg-white" /><div className="absolute top-1/2 h-1 w-full bg-white" /><div className="absolute right-2 top-3 h-8 w-8 rounded-full bg-[#ffedba]" /></div>
          <div className="absolute bottom-[15%] right-[8%] h-[21%] w-[42%] rounded-t-3xl rounded-b-lg border-b-[12px] border-[#a78e81] bg-[#c8b5c6] shadow-lg"><div className="absolute -top-6 left-2 h-12 w-[95%] rounded-t-2xl bg-[#ddc9da]" /><div className="absolute -top-3 right-3 h-10 w-12 rotate-6 rounded-xl bg-[#fff3df]" /></div>
          <div className="absolute bottom-[15%] left-[12%] h-[18%] w-[18%] rounded-t-full bg-[#a4b69b]" /><div className="absolute bottom-[13%] left-[15%] h-[10%] w-[12%] rounded-b-xl bg-[#c38f74]" />
          <div className="absolute left-[33%] bottom-[3%] h-[10%] w-[44%] rounded-[50%] bg-[#faf0df]/80" />
        </div>
        {room.decorations.map(item => <button key={item.id} aria-label={`${item.emoji} 소품${editing ? " 이동" : ""}`} onPointerDown={e => startDrag(e, item)} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onKeyDown={e => keyboardMove(e, item)} onClick={() => editing && setSelected(item.id)} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl p-2 text-4xl sm:text-5xl ${editing ? "touch-none cursor-grab" : "cursor-default"} ${editing && selected === item.id ? "ring-2 ring-[#b97981] bg-white/40" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%` }}>{item.emoji}</button>)}
        {room.pins.map(item => {
          const letter = mail.find(m => m.id === item.id); if (!letter?.image) return null;
          return <button key={item.id} aria-label={`${letter.fromName}의 편지${editing ? " 이동" : " 열기"}`} onPointerDown={e => startDrag(e, item)} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onKeyDown={e => keyboardMove(e, item)} onClick={() => editing ? setSelected(item.id) : void openLetter(letter)} className={`absolute w-[23%] -translate-x-1/2 -translate-y-1/2 -rotate-3 bg-white p-1.5 pb-4 shadow-lg ${editing ? "touch-none cursor-grab" : ""} ${selected === item.id && editing ? "ring-2 ring-[#b97981]" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%` }}><span className="absolute -top-2 left-[30%] h-4 w-[40%] bg-[#e9bcab]/80" /><Image unoptimized width={800} height={600} src={letter.image} alt={`${letter.fromName}의 낙서`} className="aspect-[4/3] w-full object-contain" /><span className="block truncate pt-1 text-[10px]">from. {letter.fromName}</span></button>;
        })}
        {!room.pins.length && <p className="pointer-events-none absolute right-[7%] top-[17%] w-[38%] text-center text-xs leading-relaxed text-[#a88d7e]">친구의 편지를<br />최대 2개 붙여 봐</p>}
      </div>
      <div className="mt-4 rounded-2xl bg-white/90 p-4">
        {editing ? <>
          <div className="flex items-center justify-between gap-2 text-sm"><p className="font-bold">방 꾸미기 <span className="text-xs font-normal">{room.decorations.length + room.pins.length}/20</span></p><div className="flex gap-3"><button disabled={saving} onClick={() => { setRoom(saved.current); setEditing(false); setSelected(""); }}>취소</button><button disabled={saving} onClick={saveRoom} className="rounded-xl bg-[#b97981] px-4 py-2 text-white">{saving ? "저장 중…" : "꾸미기 저장"}</button></div></div>
          <fieldset disabled={saving} className="mt-3"><legend className="text-xs">벽지</legend><div className="mt-2 flex gap-3">{WALLS.map((wall, i) => <button key={wall} aria-label={`벽지 ${i + 1}`} aria-pressed={room.wall === wall} onClick={() => setRoom(r => ({ ...r, wall }))} className={`h-8 w-8 rounded-full border-2 ${room.wall === wall ? "border-[#b97981]" : "border-white"}`} style={{ background: wall }} />)}</div><div className="mt-3 flex flex-wrap gap-2">{STICKERS.map(emoji => <button key={emoji} aria-label={`${emoji} 소품 추가`} onClick={() => addDecoration(emoji)} className="rounded-xl bg-[#fbf5ef] px-3 py-2 text-2xl">{emoji}</button>)}</div></fieldset>
          <div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-[#a58d81]">소품을 끌어 옮겨 봐. 키보드 방향키도 돼.</p><button disabled={!selected || saving} onClick={() => { setRoom(r => ({ ...r, decorations: r.decorations.filter(d => d.id !== selected), pins: r.pins.filter(p => p.id !== selected) })); setSelected(""); }} className="shrink-0 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-500 disabled:opacity-40">선택한 것 치우기</button></div>
        </> : <div className="flex gap-3"><button disabled={!ready} onClick={() => { setEditing(true); setNotice(""); }} className="flex-1 rounded-xl bg-[#f4e9e0] py-3 text-sm font-bold">✦ 방 꾸미기</button><button disabled={!ready} onClick={() => setComposing(true)} className="flex-1 rounded-xl bg-[#b97981] py-3 text-sm font-bold text-white">편지 쓰기</button></div>}
      </div>
      {notice && <p role="status" className="mt-3 text-center text-sm">{notice}</p>}
      <section ref={mailbox} className="mt-7 scroll-mt-20"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">낙서 우편함</h2><button onClick={() => void refresh(false, uid)} className="text-xs text-[#a58d81]">새로고침</button></div><p className="mt-1 text-xs text-[#a58d81]">나에게 온 작은 마음들을 모아 둬.</p>
        {!mail.length ? <div className="mt-4 rounded-2xl border border-dashed border-[#dac8b7] bg-white/60 p-8 text-center"><div className="mx-auto w-24"><Envelope /></div><p className="mt-3 text-sm">아직 도착한 편지가 없어.</p><p className="mt-1 text-xs text-[#a58d81]">먼저 친구에게 한 장 보내 볼까?</p></div> : <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{mail.map(m => <button disabled={Boolean(opening)} key={m.id} onClick={() => void openLetter(m)} className="relative rounded-2xl bg-white/80 p-4 text-left transition hover:-translate-y-1"><Envelope /><p className="mt-3 truncate text-sm font-bold">{m.fromName}에게서</p><p className="mt-1 text-[11px] text-[#a58d81]">{m.unlockAt > now ? `🔒 ${date(m.unlockAt)} 열림` : m.opened ? "다시 읽기" : "봉투를 눌러 열기"}</p>{!m.opened && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#c68289]" />}</button>)}</div>}
      </section>
    </div>
    {(composing || opened || opening) && createPortal(<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#3e302b]/45 p-4 backdrop-blur-sm">
      <div data-room-dialog role="dialog" aria-modal="true" aria-label={composing ? "낙서 편지 쓰기" : "받은 편지"} className="w-full max-w-lg">
        {composing && <LetterComposer friends={friends} onClose={() => setComposing(false)} onSend={async draft => { await request({ action: "send", ...draft }); setComposing(false); setNotice("편지를 보냈어! 친구 우편함에 도착했어."); }} />}
        {opening && <div className="mx-auto w-64"><Envelope open /></div>}
        {opened && <div className="max-h-[85dvh] overflow-y-auto rounded-3xl bg-[#fffcf5] p-5 text-[#66544e]"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">{opened.fromName}의 편지</h2><button aria-label="편지 닫기" onClick={() => setOpened(null)}>✕</button></div><Image unoptimized width={800} height={600} src={opened.image} alt={`${opened.fromName}이 그린 편지`} className="w-full rounded-xl" /><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">{opened.text}</p><p className="mt-3 text-xs text-[#a58d81]">{date(opened.createdAt)}</p><button onClick={() => pin(opened)} className="mt-5 w-full rounded-2xl bg-[#b97981] py-3 font-bold text-white">{room.pins.some(p => p.id === opened.id) ? "방으로 돌아가기" : "내 방 벽에 붙이기"}</button></div>}
      </div>
    </div>, document.body)}
    <style>{`@keyframes letterOpen{0%{transform:scale(.8) rotate(-6deg)}50%{transform:scale(1.06) rotate(2deg)}100%{transform:translateY(-30px) scale(1.1);opacity:0}}.letter-opening{animation:letterOpen .65s ease-in-out forwards}@media(prefers-reduced-motion:reduce){.letter-opening{animation:none}}`}</style>
  </PageContainer>;
}
