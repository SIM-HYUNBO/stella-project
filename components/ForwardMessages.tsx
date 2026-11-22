"use client";
/* eslint-disable @next/next/no-img-element -- Original chat images in selection previews. */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { collection, doc, getDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/app/firebase";
import { addChatDocument } from "@/lib/event-chat-document";
import { apiFetch, playSendSound } from "@/lib/api-fetch";
import { bundleItems, ForwardSource } from "@/lib/forwarded-messages";
import { useHiddenFriends } from "./HiddenFriends";
import { Check, Forward, X } from "lucide-react";

type Target = { key: string; name: string; kind: "dm" | "group" | "meeting"; id: string; members: string[] };
export default function ForwardMessages({ messages, initialId, nickname, onClose }: { messages: ForwardSource[]; initialId: string; nickname: string; onClose: () => void }) {
  const hidden = useHiddenFriends();
  const [selected, setSelected] = useState(new Set([initialId]));
  const [targets, setTargets] = useState<Target[]>([]);
  const [target, setTarget] = useState("");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const lock = useRef(false);
  const eligible = messages.filter(m => !m.type || m.type === "text" || m.type === "image");
  useEffect(() => {
    let alive = true;
    const uid = auth.currentUser?.uid;
    if (!uid) { setError("다시 로그인해 줘."); setLoading(false); return; }
    void (async () => {
      try {
        const [friends, groups, meetings] = await Promise.all([
          getDocs(query(collection(db, "friends"), where("users", "array-contains", uid))),
          getDocs(query(collection(db, "group_rooms"), where("members", "array-contains", nickname))),
          getDocs(query(collection(db, "meeting_rooms"), where("members", "array-contains", nickname))),
        ]);
        const friendIds = Array.from(new Set(friends.docs.flatMap(d => (d.data().users as string[]).filter(id => id !== uid))));
        const profiles = await Promise.all(friendIds.map(id => getDoc(doc(db, "users", id))));
        const result: Target[] = profiles.filter(p => p.exists() && p.data()?.nickname).map(p => ({ key: `dm:${p.id}`, id: p.id, kind: "dm", name: p.data()!.nickname, members: [p.data()!.nickname] }));
        for (const [snap, kind] of [[groups, "group"], [meetings, "meeting"]] as const) snap.docs.forEach(d => result.push({ key: `${kind}:${d.id}`, id: d.id, kind, name: d.data().name || "채팅방", members: d.data().members || [] }));
        if (alive) setTargets(result);
      } catch { if (alive) setError("전달할 채팅방을 불러오지 못했어. 닫고 다시 시도해 줘."); }
      finally { if (alive) setLoading(false); }
    })();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { alive = false; document.body.style.overflow = old; };
  }, [nickname]);
  const available = targets.filter(t => t.kind !== "dm" || hidden.visible(t.id, t.name));
  const send = async () => {
    if (lock.current) return;
    const destination = available.find(t => t.key === target);
    if (!destination || !auth.currentUser) return;
    lock.current = true; setSending(true); setError("");
    try {
      const items = bundleItems(messages, selected);
      const summary = `묶음 메시지 ${items.length}개`;
      const data = { from: nickname, content: summary, type: "bundle", bundle: items, createdAt: serverTimestamp(), readBy: [nickname],
        ...(destination.kind === "dm" ? { to: destination.name, fromUid: auth.currentUser.uid, toUid: destination.id } : {}) };
      const path = destination.kind === "dm" ? collection(db, "messages") : collection(db, destination.kind === "group" ? "group_rooms" : "meeting_rooms", destination.id, "messages");
      await addChatDocument(path, data);
      void apiFetch("/api/fcm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toNicknames: destination.members.filter(n => n !== nickname), fromNickname: nickname, message: summary,
        ...(destination.kind !== "dm" ? { roomName: destination.name } : {}), url: destination.kind === "dm" ? `/avatar?open=${encodeURIComponent(nickname)}` : `/${destination.kind === "group" ? "groupchat" : "meetingroom"}?room=${encodeURIComponent(destination.id)}` }) }).catch(() => {});
      onClose();
      try { playSendSound(); } catch { /* The message has already been delivered. */ }
    } catch (e) { setError(e instanceof Error ? e.message : "전달하지 못했어. 다시 시도해 줘."); }
    finally { lock.current = false; setSending(false); }
  };
  return createPortal(<div className="fixed inset-0 z-[1000000] bg-slate-900/40 flex items-center justify-center p-3" onClick={e => e.stopPropagation()}>
    <section role="dialog" aria-modal="true" aria-label="메시지 묶어서 전달" className="bg-white rounded-3xl w-full max-w-lg max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl" onKeyDown={e => { if (e.key === "Escape" && !sending) onClose(); }}>
      <header className="p-5 border-b flex items-center justify-between"><h2 className="font-semibold flex items-center gap-2"><Forward size={19} />{step === 0 ? `메시지 선택 · ${selected.size}/30` : "전달할 채팅방"}</h2><button autoFocus type="button" disabled={sending} aria-label="닫기" onClick={onClose}><X size={21} /></button></header>
      <div className="overflow-y-auto p-4 space-y-2">{step === 0 ? <><p className="text-xs text-slate-400 mb-3">글·사진·손글씨를 원래 순서대로 묶어서 보내.</p>{eligible.map(m => <button type="button" key={m.id} aria-pressed={selected.has(m.id)} onClick={() => { setError(""); setSelected(previous => { const next = new Set(previous); if (next.has(m.id)) next.delete(m.id); else if (next.size < 30) next.add(m.id); return next; }); }} className={`w-full rounded-2xl p-3 flex gap-3 text-left border ${selected.has(m.id) ? "bg-sky-50 border-sky-200" : "border-slate-100"}`}>
        <span className={`rounded-full w-5 h-5 shrink-0 border flex items-center justify-center ${selected.has(m.id) ? "bg-sky-400 text-white border-sky-400" : "border-slate-300"}`}>{selected.has(m.id) && <Check size={13} />}</span>
        <span className="min-w-0"><b className="text-xs text-slate-500 block mb-1">{m.from}</b>{m.spoiler ? <span className="text-sm">스포일러 메시지</span> : m.type === "image" ? <img src={m.content} alt="전달할 사진" className="h-20 max-w-full rounded-lg object-contain" /> : <span className="text-sm whitespace-pre-wrap break-words line-clamp-3">{m.content}</span>}</span>
      </button>)}</> : loading ? <p className="text-sm text-slate-400 p-4">채팅방을 불러오고 있어…</p> : available.length ? available.map(t => <button type="button" key={t.key} aria-pressed={target === t.key} onClick={() => setTarget(t.key)} className={`w-full text-left rounded-2xl p-4 border ${target === t.key ? "bg-sky-50 border-sky-300" : "border-slate-100"}`}><small className="text-slate-400 block">{t.kind === "dm" ? "1:1" : t.kind === "group" ? "단체" : "회의방"}</small><span className="text-sm font-medium">{t.name}</span></button>) : <p className="text-sm text-slate-400 p-4">전달할 친구나 채팅방이 없어.</p>}</div>
      {error && <p role="alert" className="px-5 py-2 text-xs text-red-500">{error}</p>}
      <footer className="p-4 border-t flex gap-2">{step === 1 && <button type="button" disabled={sending} onClick={() => setStep(0)} className="rounded-full px-5 py-3 bg-slate-100 text-sm">이전</button>}<button type="button" disabled={sending || !selected.size || (step === 1 && !target)} onClick={() => { if (step === 0) { try { bundleItems(messages, selected); setError(""); setStep(1); } catch(e) { setError((e as Error).message); } } else void send(); }} className="flex-1 rounded-full bg-sky-400 text-white py-3 text-sm font-semibold disabled:opacity-40">{sending ? "전달하고 있어…" : step === 0 ? "다음" : "묶어서 전달"}</button></footer>
    </section>
  </div>, document.body);
}
