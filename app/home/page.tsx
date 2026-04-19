"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "../../components/PageContainer";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  updateDoc,
  doc,
  setDoc,
} from "firebase/firestore";

/* 타입 */
type Message = {
  id: string;
  from: string;
  to: string;
  content: string;
  createdAt?: any;
  readBy?: string[];
};

type User = {
  id: string;
  nickname: string;
};

export default function Chat() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentChatUser, setCurrentChatUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /* 🔥 VIP 상태 */
  const [isMyVIP, setIsMyVIP] = useState(false);

  useEffect(() => {
    const vip = localStorage.getItem("vip") === "true";
    setIsMyVIP(vip);
  }, []);

  /* 🔥 AI 요약 ON/OFF 상태 */
  const [aiSummaryOn, setAiSummaryOn] = useState(false);

  useEffect(() => {
    const enabled = localStorage.getItem("ai_summary") === "true";
    setAiSummaryOn(enabled);
  }, []);

  /* 🔥 AI 요약 결과 */
  const [summary, setSummary] = useState("");

  /* 🔔 알림음 */
  const playNotificationSound = () => {
    const saved = localStorage.getItem("alarmSound") || "1";

    const map: Record<string, string> = {
      "1": "/sounds/alert1.mp3",
      "2": "/sounds/alert2.mp3",
      "3": "/sounds/alert3.mp3",
      "4": "/sounds/alert4.mp3",
      "5": "/sounds/alert5.mp3",
      "6": "/sounds/alert6.mp3",
      "7": "/sounds/alert7.mp3",
      "8": "/sounds/alert8.mp3",
      "9": "/sounds/alert9.mp3",
      "10": "/sounds/alert10.mp3",
    };

    const audio = new Audio(map[saved]);
    audio.play();
  };

  /* 🔥 AI 요약 */
  const runSummary = async () => {
    const enabled = localStorage.getItem("ai_summary") === "true";

    // ❌ OFF면 완전 차단
    if (!enabled) return;

    if (!currentChatUser) return;

    const res = await fetch("/api/ai-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    const data = await res.json();

    setSummary(data.summary);

    await setDoc(
      doc(db, "chat_summaries", currentChatUser.id),
      {
        summary: data.summary,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  };

  /* 로그인 */
  useEffect(() => {
    const unsub = watchAuthState((user) => {
      if (user) setNickname(user.displayName || "유저");
    });
    return () => unsub();
  }, []);

  /* 유저 목록 */
  useEffect(() => {
    if (!nickname) return;

    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const list: User[] = snap.docs.map((d) => ({
        id: d.id,
        nickname: d.data().nickname,
      }));
      setUsers(list.filter((u) => u.nickname !== nickname));
    };

    fetchUsers();
  }, [nickname]);

  /* 메시지 */
  useEffect(() => {
    if (!currentChatUser || !nickname) return;

    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));

    const unsub = onSnapshot(q, async (snap) => {
      const msgs: Message[] = [];

      for (const d of snap.docs) {
        const data = d.data();

        const m: Message = {
          id: d.id,
          from: data.from,
          to: data.to,
          content: data.content,
          createdAt: data.createdAt,
          readBy: data.readBy || [],
        };

        const isMyChat =
          (m.from === nickname && m.to === currentChatUser.nickname) ||
          (m.from === currentChatUser.nickname && m.to === nickname);

        if (!isMyChat) continue;

        if (m.from !== nickname && !m.readBy?.includes(nickname)) {
          await updateDoc(doc(db, "messages", m.id), {
            readBy: [...(m.readBy || []), nickname],
          });
          m.readBy = [...(m.readBy || []), nickname];
        }

        msgs.push(m);

        if (m.from !== nickname) {
          playNotificationSound();
        }
      }

      setMessages(msgs);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });

    return () => unsub();
  }, [currentChatUser, nickname]);

  /* 메시지 전송 */
  const sendMessage = async () => {
    if (!input.trim() || !nickname || !currentChatUser) return;

    await addDoc(collection(db, "messages"), {
      from: nickname,
      to: currentChatUser.nickname,
      content: input.trim(),
      createdAt: serverTimestamp(),
      readBy: [nickname],
    });

    setInput("");
  };

  if (!nickname) return <div>로딩중...</div>;

  /* 채팅 UI */
  const renderChat = () => (
    <>
      {/* 🔥 요약 표시 (ON일 때만) */}
      {aiSummaryOn && summary && (
        <div className="p-3 bg-yellow-50 border text-sm">
          🧠 {summary}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showUser = !prev || prev.from !== m.from;

          const isMine = m.from === nickname;
          const isVIP = m.from === nickname && isMyVIP;

          return (
            <div key={m.id} className="flex flex-col">
              <div
                className={`flex flex-col max-w-xs ${
                  isMine ? "self-end items-end" : "self-start items-start"
                }`}
              >
                {showUser && (
                  <div className="text-xs mb-1 flex items-center gap-1">
                    <span className={isVIP ? "text-yellow-600 font-semibold" : ""}>
                      {m.from}
                    </span>

                    {isVIP && (
                      <span className="text-[10px] bg-yellow-400 text-white px-1 rounded">
                        VIP
                      </span>
                    )}
                  </div>
                )}

                <div
                  className={`px-3 py-2 rounded-2xl ${
                    isMine
                      ? isVIP
                        ? "bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-400"
                        : "bg-red-100"
                      : "bg-gray-200"
                  }`}
                >
                  {m.content}
                </div>

                <div className="text-[10px] text-gray-400">
                  {formatTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex border-t p-3 gap-2">
        <input
          className="flex-1 border rounded-xl px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="메시지 입력"
        />

        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-yellow-200 rounded-xl"
        >
          전송
        </button>

        {!isMyVIP && (
          <button
            onClick={() => router.push("/vip")}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow"
          >
            VIP 구매
          </button>
        )}

        {/* 🔥 ON일 때만 요약 버튼 */}
        {isMyVIP && aiSummaryOn && (
          <button
            onClick={runSummary}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl"
          >
            채팅 요약
          </button>
        )}
      </div>
    </>
  );

  return (
    <PageContainer>
      <div className="h-screen flex">
        <div className="w-60 border-r p-4 flex flex-col gap-2">
          <div className="font-bold">회원 목록</div>

          {users.map((u) => {
            const isVIP = u.nickname === nickname && isMyVIP;

            return (
              <div
                key={u.id}
                className={`p-2 rounded cursor-pointer flex items-center gap-1 ${
                  currentChatUser?.id === u.id
                    ? "bg-gray-300"
                    : "hover:bg-gray-200"
                }`}
                onClick={() => setCurrentChatUser(u)}
              >
                <span className={isVIP ? "text-yellow-600" : ""}>
                  {u.nickname}
                </span>

                {isVIP && (
                  <span className="text-[10px] bg-yellow-400 text-white px-1 rounded">
                    VIP
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-1 flex flex-col">
          {currentChatUser ? (
            renderChat()
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              채팅 상대를 선택해 주세요☺️
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

/* 시간 */
const formatTime = (ts: any) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};