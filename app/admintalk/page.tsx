"use client";

import { useEffect, useState, useRef } from "react";
import PageContainer from "../../components/PageContainer";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";
import {
  collection, doc, getDoc, setDoc, updateDoc, addDoc,
  query, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";

type Message = { id: string; user: string; content: string; createdAt?: any; readBy?: string[]; };
type Room = { id: string; name: string; members: string[]; };

export default function ChatPage() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mobileStep, setMobileStep] = useState<"list" | "chat">("list");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastNotifiedId = useRef<string | null>(null);
  const ADMIN_NAME = "관리자";

  useEffect(() => { if (Notification.permission !== "granted") Notification.requestPermission(); }, []);

  const formatDate = (ts: any) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };
  const formatTime = (ts: any) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  };

  useEffect(() => {
    const unsub = watchAuthState((user) => { if (user) setNickname(user.displayName || "유저"); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!nickname) return;
    const initRooms = async () => {
      const roomsRef = collection(db, "aroom");
      if (nickname === ADMIN_NAME) {
        const q = query(roomsRef);
        const unsub = onSnapshot(q, (snap) => {
          const userRooms: Room[] = snap.docs
            .map((d) => {
              const data = d.data();
              const members: string[] = data.members || [];
              const userName = members.find((m) => m !== ADMIN_NAME);
              if (!userName) return null;
              return { id: d.id, name: userName, members };
            })
            .filter(Boolean) as Room[];
          setRooms(userRooms);
          if (!currentRoomId && userRooms.length > 0) setCurrentRoomId(userRooms[0].id);
        });
        return unsub;
      } else {
        const roomId = nickname;
        const roomRef = doc(db, "aroom", roomId);
        const docSnap = await getDoc(roomRef);
        if (!docSnap.exists()) {
          await setDoc(roomRef, { name: "관리자 톡", members: [nickname, ADMIN_NAME] });
        } else {
          const data = docSnap.data();
          if (!data.members.includes(nickname)) await updateDoc(roomRef, { members: [...data.members, nickname] });
        }
        setRooms([{ id: roomId, name: "관리자 톡", members: [nickname, ADMIN_NAME] }]);
        setCurrentRoomId(roomId);
      }
    };
    initRooms();
  }, [nickname]);

  useEffect(() => {
    if (!currentRoomId || !nickname) return;
    const q = query(collection(db, "aroom", currentRoomId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, user: d.data().user, content: d.data().content, createdAt: d.data().createdAt, readBy: d.data().readBy || [] }));
      setMessages(msgs);
      snap.docChanges().forEach((change) => {
        if (change.type === "added" && change.doc.data().user !== nickname && document.hidden && change.doc.id !== lastNotifiedId.current) {
          lastNotifiedId.current = change.doc.id;
          new Notification(change.doc.data().user || "알림", { body: change.doc.data().content });
        }
      });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
    return () => unsub();
  }, [currentRoomId, nickname]);

  const sendMessage = async () => {
    if (!input.trim() || !nickname || !currentRoomId) return;
    const text = input.trim();
    await addDoc(collection(db, "aroom", currentRoomId, "messages"), { user: nickname, content: text, createdAt: serverTimestamp(), readBy: [nickname] });
    const currentRoom = rooms.find((r) => r.id === currentRoomId);
    const targets = currentRoom?.members.filter((m) => m !== nickname) ?? [];
    if (targets.length > 0) {
      fetch("/api/fcm", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toNicknames: targets, fromNickname: nickname, message: text.length > 60 ? text.slice(0, 60) + "…" : text, roomName: "관리자 톡", url: "/admintalk" }) }).catch(() => {});
    }
    setInput("");
  };

  if (!nickname) return (
    <main className="relative min-h-screen flex items-center justify-center">
      <div className="fixed inset-0 bg-gradient-to-br from-[#fff6ee] via-[#fff0e0] to-[#fff8f0]" />
      <p className="relative z-10 text-[#c09070] font-black">로딩중...</p>
    </main>
  );

  const ChatUI = () => (
    <>
      <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-orange-100 bg-white/60 backdrop-blur-md">
        <button onClick={() => setMobileStep("list")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-400 font-bold text-lg">←</button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-amber-300 flex items-center justify-center text-sm">👤</div>
        <p className="font-black text-[#3d1f00] text-sm">{rooms.find((r) => r.id === currentRoomId)?.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showDate = !prev || formatDate(prev.createdAt) !== formatDate(m.createdAt);
          return (
            <div key={m.id} className="flex flex-col">
              {showDate && <div className="text-center text-xs text-[#c09070] my-4 font-semibold">── {formatDate(m.createdAt)} ──</div>}
              <div className={`flex flex-col max-w-[75%] ${m.user === nickname ? "self-end items-end" : "self-start items-start"}`}>
                <p className="text-[10px] text-[#c09070] mb-1 font-semibold">{m.user}</p>
                <div className={`px-4 py-2.5 rounded-[18px] text-sm leading-relaxed shadow-sm ${
                  m.user === nickname
                    ? "bg-gradient-to-r from-orange-400 to-amber-300 text-white rounded-br-[6px]"
                    : "bg-white/90 border border-orange-100 text-[#3d1f00] rounded-bl-[6px]"
                }`}>
                  {m.content}
                </div>
                <p className="text-[10px] text-[#c09070] mt-1">{formatTime(m.createdAt) || "방금"}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center gap-2 px-4 py-3 bg-white/70 backdrop-blur-md border-t border-orange-100 shrink-0">
        <input
          className="flex-1 bg-orange-50 border border-orange-100 rounded-[16px] px-4 py-2.5 text-sm text-[#3d1f00] placeholder:text-[#d4a07a] outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="메시지 입력..."
        />
        <button onClick={sendMessage}
          className="w-11 h-11 rounded-[14px] bg-gradient-to-r from-orange-400 to-amber-300 text-white font-black shadow-[0_4px_14px_rgba(255,160,50,0.35)] active:scale-95 transition-transform flex items-center justify-center">
          ▶
        </button>
      </div>
    </>
  );

  return (
    <PageContainer>
      <div className="relative flex h-screen -m-4">
        <div className="fixed inset-0 bg-gradient-to-br from-[#fff6ee] via-[#fff0e0] to-[#fff8f0] -z-10" />

        {/* 모바일 */}
        <div className="md:hidden w-full h-full flex flex-col">
          {mobileStep === "list" && (
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-3 border-b border-orange-100 bg-white/60 backdrop-blur-md">
                <p className="font-black text-[#3d1f00] text-base">💬 관리자 톡</p>
              </div>
              <div className="px-4 pt-4 space-y-3">
                {rooms.map((r) => (
                  <div key={r.id} onClick={() => { setCurrentRoomId(r.id); setMobileStep("chat"); }}
                    className="rounded-[20px] bg-white/80 border border-orange-100 px-5 py-4 flex items-center gap-3 shadow-sm cursor-pointer active:scale-[0.98] transition-transform">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-300 to-amber-300 flex items-center justify-center text-xl shrink-0">👤</div>
                    <p className="font-black text-[#3d1f00] text-sm">{r.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {mobileStep === "chat" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <ChatUI />
            </div>
          )}
        </div>

        {/* PC */}
        <div className="hidden md:flex w-full">
          <div className="w-64 border-r border-orange-100 bg-white/60 backdrop-blur-md flex flex-col">
            <div className="px-4 py-3 border-b border-orange-100">
              <p className="font-black text-[#3d1f00] text-base">💬 관리자 톡</p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {rooms.map((r) => (
                <div key={r.id} onClick={() => setCurrentRoomId(r.id)}
                  className={`rounded-[16px] px-4 py-3 flex items-center gap-3 cursor-pointer transition-all ${currentRoomId === r.id ? "bg-gradient-to-r from-orange-400 to-amber-300 shadow-md" : "bg-white/80 border border-orange-100 hover:bg-orange-50"}`}>
                  <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-sm">👤</div>
                  <p className={`font-black text-sm ${currentRoomId === r.id ? "text-white" : "text-[#3d1f00]"}`}>{r.name}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {currentRoomId ? <ChatUI /> : (
              <div className="flex items-center justify-center h-full">
                <p className="text-[#c09070] font-semibold">채팅방을 선택해주세요</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
