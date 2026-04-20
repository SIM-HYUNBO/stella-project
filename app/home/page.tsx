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
  deleteDoc,
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

  /* 🔥 모바일 체크 (원본 유지) */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* 🔥 VIP 맵 (추가된 핵심) */
  const [userVipMap, setUserVipMap] = useState<Record<string, boolean>>({});

  /* 🔥 AI 요약 */
  const [aiSummaryOn, setAiSummaryOn] = useState(false);
  useEffect(() => {
    setAiSummaryOn(localStorage.getItem("ai_summary") === "true");
  }, []);

  const [summary, setSummary] = useState("");

  /* 🔥 타이핑 */
  const [isTyping, setIsTyping] = useState(false);

  /* 🔥 선택된 메시지 */
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);

  /* 🔥 마지막 메시지 */
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});

  /* 🔔 알림 */
  const playNotificationSound = () => {
    const audio = new Audio("/sounds/alert1.mp3");
    audio.play();
  };

  /* 🔥 AI 요약 */
  const runSummary = async () => {
    if (!aiSummaryOn || !currentChatUser) return;

    const res = await fetch("/api/ai-summary", {
      method: "POST",
      body: JSON.stringify({ messages }),
    });

    const data = await res.json();
    setSummary(data.summary);

    await setDoc(
      doc(db, "chat_summaries", currentChatUser.id),
      { summary: data.summary, updatedAt: new Date() },
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

  /* 🔥 유저 + VIP 로딩 (핵심) */
  useEffect(() => {
    if (!nickname) return;

    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));

      const list: User[] = [];
      const vipMap: Record<string, boolean> = {};

      snap.docs.forEach((d) => {
        const data = d.data();

        list.push({
          id: d.id,
          nickname: data.nickname,
        });

        // ✅ 핵심: isVip 사용
        vipMap[data.nickname] = data.isVip === true;
      });

      setUsers(list.filter((u) => u.nickname !== nickname));
      setUserVipMap(vipMap);
    };

    fetchUsers();
  }, [nickname]);

  /* 메시지 */
  useEffect(() => {
    if (!currentChatUser || !nickname) return;

    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));

    const unsub = onSnapshot(q, async (snap) => {
      const msgs: Message[] = [];
      let lastMsg = "";

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

        lastMsg = m.content;

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

      setLastMessages((prev) => ({
        ...prev,
        [currentChatUser.id]: lastMsg,
      }));

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
    setIsTyping(false);
  };

  /* 삭제 */
  const deleteMessage = async (id: string) => {
    await deleteDoc(doc(db, "messages", id));
    setSelectedMsgId(null);
  };

  /* 수정 */
  const editMessage = async (id: string) => {
    const text = prompt("수정할 내용");
    if (!text) return;

    await updateDoc(doc(db, "messages", id), {
      content: text,
    });

    setSelectedMsgId(null);
  };

  /* 🔥 내 VIP */
  const isMyVIP = userVipMap[nickname || ""] === true;

  if (!nickname) return <div>로딩중...</div>;

  /* 채팅 UI (절대 안 건드림) */
  const renderChat = () => (
    <>
      {aiSummaryOn && summary && (
        <div className="p-3 bg-yellow-50 border text-sm">
          🧠 {summary}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.map((m, i) => {
          const currentDate = formatDateLabel(m.createdAt);
          const prevDate =
            i > 0 ? formatDateLabel(messages[i - 1].createdAt) : null;
          const showDate = currentDate !== prevDate;

          const prev = messages[i - 1];
          const showUser = !prev || prev.from !== m.from;

          const isMine = m.from === nickname;
          const isVIP = userVipMap[m.from] === true;

          return (
            <>
              {showDate && (
                <div className="flex items-center justify-center text-xs text-gray-400 w-full">
                  <div className="w-10 border-t" />
                  <span className="px-1">{currentDate}</span>
                  <div className="w-10 border-t" />
                </div>
              )}

              <div
                key={m.id}
                className="flex flex-col"
                onDoubleClick={() => setSelectedMsgId(m.id)}
              >
                <div
                  className={`flex flex-col max-w-xs ${
                    isMine ? "self-end items-end" : "self-start items-start"
                  }`}
                >
                  {showUser && (
                    <div className="text-xs mb-1 flex items-center gap-1">
                      <span
                        className={isVIP ? "text-yellow-600 font-semibold" : ""}
                      >
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

                  {isMine && (
                    <div className="text-[10px] text-gray-400">
                      {m.readBy?.length > 1 ? "✔" : "1"}
                    </div>
                  )}

                  {selectedMsgId === m.id && isMine && (
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => editMessage(m.id)}>수정</button>
                      <button onClick={() => deleteMessage(m.id)}>삭제</button>
                    </div>
                  )}

                  <div className="text-[10px] text-gray-400">
                    {formatTime(m.createdAt)}
                  </div>
                </div>
              </div>
            </>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex border-t p-3 gap-2">
        <input
          className="flex-1 border rounded-xl px-3 py-2"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setIsTyping(true);
          }}
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

  /* 🔥 모바일 / PC 구조 원본 유지 */
  if (isMobile) {
    if (!currentChatUser) {
      return (
        <PageContainer>
          <div className="h-screen p-4">
            <div className="text-xl font-bold mb-4">회원 목록</div>

            {users.map((u) => (
              <div
                key={u.id}
                className="p-3 border rounded-xl mb-2"
                onClick={() => setCurrentChatUser(u)}
              >
                {u.nickname}
                <div className="text-xs text-gray-400">
                  {lastMessages[u.id]}
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      );
    }

    return (
      <PageContainer>
        <div className="h-screen flex flex-col">
          <div className="flex items-center gap-2 p-3 border-b">
            <button onClick={() => setCurrentChatUser(null)}>←</button>
            <div className="font-bold">
              {currentChatUser.nickname}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {renderChat()}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="h-screen flex">
        <div className="w-60 border-r p-4 flex flex-col gap-2">
          <div className="font-bold">회원 목록</div>

          {users.map((u) => (
            <div
              key={u.id}
              className={`p-2 rounded cursor-pointer ${
                currentChatUser?.id === u.id
                  ? "bg-gray-300"
                  : "hover:bg-gray-200"
              }`}
              onClick={() => setCurrentChatUser(u)}
            >
              {u.nickname}
              <div className="text-xs text-gray-400">
                {lastMessages[u.id]}
              </div>
            </div>
          ))}
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

/* 날짜 */
const formatDateLabel = (ts: any) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("ko-KR");
};