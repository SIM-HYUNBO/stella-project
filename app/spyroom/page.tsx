"use client";

import SpyIcon from "@/components/SpyIcon";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import LoadingScreen from "@/components/LoadingScreen";
import { apiFetch, playSendSound } from "@/lib/api-fetch";
import type { SpyMember, SpyMessage } from "@/lib/spy-room";

type RoomSummary = { id: string; name: string; count: number; startedAt: number | null };
type RoomView = { id: string; name: string; members: SpyMember[]; online: string[]; startedAt: number | null; role: "spy" | "member" | null; mission: string | null; messages: SpyMessage[] };
type Lobby = { uid: string; rooms: RoomSummary[]; friends: SpyMember[] };
const inputClass = "min-w-0 rounded-2xl border border-sky-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus-visible:outline-sky-400";
const primary = "rounded-2xl bg-sky-400 px-4 py-2.5 text-sm font-bold text-white transition active:scale-95 disabled:opacity-40";
const secondary = "rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-sky-50";

async function request<T>(body?: object): Promise<T> {
  const response = await apiFetch("/api/spy-room", body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: "action" in body && body.action === "leave" } : { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "스파이방에 연결하지 못했어.");
  return data;
}
const errorText = (error: unknown) => error instanceof Error ? error.message : "다시 시도해 줘.";

export default function SpyRoomPage() {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [entry, setEntry] = useState<{ id: string; session: string } | null>(null);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [invited, setInvited] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [reveal, setReveal] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const activeEntry = useRef<typeof entry>(null);
  const refresh = useCallback(async () => {
    setError("");
    try { setLobby(await request<Lobby>()); }
    catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!entry) return;
    let active = true;
    let pending: Promise<void> | null = null;
    const leave = () => { void Promise.resolve(pending).then(() => request({ action: "leave", ...entry })).catch(() => {}); };
    const sync = () => {
      if (!active || document.hidden || pending) return;
      pending = request<RoomView>({ action: "enter", ...entry })
        .then(view => { if (active) { setRoom(view); setConnectionError(""); } })
        .catch(e => { if (active) setConnectionError(errorText(e)); })
        .finally(() => { pending = null; });
    };
    const onVisibility = () => { if (document.hidden) leave(); else sync(); };
    sync();
    const timer = window.setInterval(sync, 5000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", leave);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [entry]);

  const lastMessage = room?.messages.at(-1)?.id;
  useEffect(() => {
    if (scroll.current && stickToBottom.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [lastMessage]);

  function open(id: string) {
    const next = { id, session: crypto.randomUUID() };
    activeEntry.current = next;
    stickToBottom.current = true;
    setRoom(null); setReveal(false); setInput(""); setError(""); setConnectionError(""); setEntry(next);
  }

  async function create() {
    if (busy || !name.trim() || !invited.length) return;
    setBusy(true); setError("");
    try {
      const result = await request<{ id: string }>({ action: "create", name, invited });
      setCreating(false); setInvited([]); setName(""); open(result.id);
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  async function send() {
    if (busy || !entry || !room?.startedAt || !input.trim()) return;
    setBusy(true); setError("");
    try {
      const view = await request<RoomView>({ action: "send", ...entry, text: input, messageId: crypto.randomUUID() });
      if (activeEntry.current !== entry) return;
      stickToBottom.current = true;
      setRoom(view); setInput(""); playSendSound();
    } catch (e) { if (activeEntry.current === entry) setError(errorText(e)); }
    finally { setBusy(false); }
  }

  return (
    <PageContainer>
      <div className="flex flex-col bg-gray-50 pb-20">
        <header className="px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-black bg-yellow-200">WAGIE SPY</span>
            <Link href="/groupchat" className="rounded-xl bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-600">일반</Link>
            <Link href="/meetingroom" className="rounded-xl bg-red-50 px-2.5 py-1 text-xs font-bold text-red-500">회의</Link>
            <span aria-current="page" className="inline-flex items-center gap-1 rounded-xl bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700"><SpyIcon />스파이</span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">스파이 단체채팅</p>
        </header>
        {entry ? (
          <div className="space-y-3 px-3">
            <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2">
              <button type="button" className={secondary} onClick={() => { activeEntry.current = null; setEntry(null); setRoom(null); void refresh(); }}>‹ 방 목록</button>
              <h1 className="min-w-0 truncate font-black text-slate-800">{room?.name || "입장 중…"}</h1>
            </div>
            {room && <>
              <section className="space-y-2 rounded-2xl border border-sky-100 bg-white p-4">
                <p className="text-sm font-bold text-slate-700">{room.startedAt ? "게임 진행 중" : `입장 대기 · ${room.online.length}/${room.members.length}명`}</p>
                {!room.startedAt && <p className="text-xs text-slate-500">초대한 친구가 모두 이 방을 열면 자동으로 시작해.</p>}
                <div className="flex flex-wrap gap-2">
                  {room.members.map(member => <span key={member.uid} className="rounded-full bg-gray-50 px-2.5 py-1 text-xs text-slate-600">{member.name} · {room.online.includes(member.uid) ? "입장" : "대기"}</span>)}
                </div>
                {room.startedAt && <button type="button" aria-expanded={reveal} className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700" onClick={() => setReveal(v => !v)}>{reveal ? "내 역할 숨기기" : "내 역할 확인"}</button>}
                {room.startedAt && reveal && <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900">{room.role === "spy" ? `너는 스파이야! 비밀 미션: ${room.mission}` : "너는 일반 멤버야. 대화하면서 누가 스파이인지 살펴봐!"}</p>}
              </section>
              {room.startedAt && <>
                <div ref={scroll} onScroll={e => { const el = e.currentTarget; stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }} role="log" aria-label="채팅 메시지" className="h-[40dvh] space-y-2 overflow-y-auto rounded-2xl bg-sky-50 p-3">
                  {!room.messages.length && <p className="py-5 text-center text-xs text-slate-500">게임이 시작됐어! 자연스럽게 대화를 시작해 봐.</p>}
                  {room.messages.map(message => {
                    const mine = message.uid === lobby?.uid;
                    return <div key={message.id} className={mine ? "text-right" : "text-left"}>
                      {!mine && <p className="mb-1 text-xs font-bold text-slate-500">{room.members.find(m => m.uid === message.uid)?.name || "친구"}</p>}
                      <p className={`inline-block max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-left text-sm shadow-sm ${mine ? "bg-sky-400 text-white" : "bg-white text-slate-800"}`}>{message.text}</p>
                    </div>;
                  })}
                </div>
                <form onSubmit={e => { e.preventDefault(); void send(); }} className="flex gap-2 rounded-full bg-white p-1.5 shadow-sm">
                  <input aria-label="메시지" className="min-w-0 flex-1 rounded-full px-3 text-sm text-slate-800 outline-none" value={input} maxLength={500} onChange={e => setInput(e.target.value)} placeholder="메시지 입력" />
                  <button className={primary} disabled={busy || !input.trim()}>전송</button>
                </form>
              </>}
            </>}
            {connectionError && <p role="status" className="text-xs text-red-600">{connectionError} 자동으로 다시 연결 중이야.</p>}
          </div>
        ) : (
          <div className="space-y-3 px-3">
            {!lobby && !error && <LoadingScreen />}
            <div className="flex flex-col items-end gap-2">
              <button type="button" className={`${primary} w-full`} disabled={!lobby} onClick={() => setCreating(v => !v)}>{creating ? "만들기 닫기" : "+ 스파이방 만들기"}</button>
              <button type="button" className={secondary} onClick={() => void refresh()}>목록 새로고침</button>
            </div>
            {creating && <form className="space-y-3 rounded-2xl bg-white p-4" onSubmit={e => { e.preventDefault(); void create(); }}>
              <input className={`w-full ${inputClass}`} aria-label="방 이름" value={name} onChange={e => setName(e.target.value)} maxLength={32} placeholder="방 이름 입력" required />
              <fieldset className="space-y-2">
                <legend className="mb-2 text-xs font-bold text-slate-600">초대할 친구 · {invited.length}명 선택 (1~9명)</legend>
                {!lobby?.friends.length && <p className="text-xs text-slate-500">먼저 친구를 추가해 줘.</p>}
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {lobby?.friends.map(friend => <label key={friend.uid} className="flex cursor-pointer items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={invited.includes(friend.uid)} disabled={busy || (invited.length === 9 && !invited.includes(friend.uid))} onChange={e => setInvited(current => e.target.checked ? [...current, friend.uid] : current.filter(id => id !== friend.uid))} />{friend.name}</label>)}
                </div>
              </fieldset>
              <button className={`${primary} w-full`} disabled={busy || !invited.length || !name.trim()}>만들기</button>
            </form>}
            {lobby?.rooms.map(item => <button type="button" key={item.id} onClick={() => open(item.id)} className="flex w-full items-center justify-between gap-2 rounded-[20px] border border-sky-100 bg-white px-4 py-3 text-left">
              <span className="min-w-0 truncate font-bold text-slate-800">{item.name}</span><span className="shrink-0 text-xs text-slate-500">{item.count}명 · {item.startedAt ? "진행 중" : "입장 대기"}</span>
            </button>)}
            {lobby && !lobby.rooms.length && <p className="rounded-2xl bg-white p-5 text-center text-sm text-slate-500">아직 스파이방이 없어. 친구를 초대해서 시작해 봐!</p>}
          </div>
        )}
        {error && <p role="alert" className="px-4 pt-3 text-sm text-red-600">{error}</p>}
      </div>
    </PageContainer>
  );
}
