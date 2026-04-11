"use client";

import { useEffect, useState, useRef } from "react";
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
} from "firebase/firestore";

/* ================= 타입 ================= */
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /* ================= 1. 로그인 ================= */
  useEffect(() => {
    const unsub = watchAuthState((user) => {
      if (user) setNickname(user.displayName || "유저");
    });
    return () => unsub();
  }, []);

  /* ================= 🔥 브라우저 알림 권한 ================= */
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  /* ================= 🔥 알림 함수 ================= */
  const showNotification = (text: string) => {
    if (Notification.permission !== "granted") return;

    new Notification("💬 새 메시지", {
      body: text,
      icon: "/icon.png",
    });
  };

  /* ================= 3. 유저 목록 ================= */
  useEffect(() => {
    if (!nickname) return;

    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const list: User[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as User),
      }));

      setUsers(list.filter((u) => u.nickname !== nickname));
    };

    fetchUsers();
  }, [nickname]);

  /* ================= 4. 메시지 구독 + 알림 ================= */
  useEffect(() => {
    if (!currentChatUser || !nickname) return;

    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));

    const seen = new Set<string>();

    const unsub = onSnapshot(q, async (snap) => {
      const msgs: Message[] = [];

      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();

          const isChat =
            (data.from === nickname && data.to === currentChatUser.nickname) ||
            (data.from === currentChatUser.nickname && data.to === nickname);

          if (!isChat) return;

          if (!seen.has(change.doc.id)) {
            seen.add(change.doc.id);

            // 🔥 상대 메시지만 알림
            if (data.from !== nickname) {
              showNotification(data.content);
            }
          }
        }
      });

      snap.forEach((d) => {
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

        if (!isMyChat) return;

        msgs.push(m);
      });

      setMessages(msgs);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });

    return () => unsub();
  }, [currentChatUser, nickname]);

  /* ================= 5. 메시지 전송 ================= */
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

  /* ================= UI ================= */
  const renderChat = () => (
    <>
      <div className="md:hidden flex items-center gap-2 p-3 border-b">
        <button onClick={() => setIsMobileMenuOpen(true)}>←</button>
        <div className="font-semibold">{currentChatUser?.nickname}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showDate =
            !prev ||
            formatDate(prev.createdAt) !== formatDate(m.createdAt);

          const isMine = m.from === nickname;

          return (
            <div key={m.id} className="flex flex-col">
              {showDate && (
                <div className="text-center text-xs text-gray-400 my-4">
                  ───── {formatDate(m.createdAt)} ─────
                </div>
              )}

              <div
                className={`flex flex-col max-w-xs ${
                  isMine ? "self-end" : "self-start"
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-2xl ${
                    isMine ? "bg-red-100" : "bg-gray-200"
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
        />
        <button onClick={sendMessage} className="bg-yellow-200 px-4">
          전송
        </button>
      </div>
    </>
  );

  return (
    <PageContainer>
      <div className="h-screen flex">

        {/* 모바일 */}
        <div className="md:hidden w-full h-full">
          {isMobileMenuOpen ? (
            <div className="p-4">
              <div className="font-bold mb-2">회원 목록</div>
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-3 bg-gray-100 mb-2"
                  onClick={() => {
                    setCurrentChatUser(u);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  {u.nickname}
                </div>
              ))}
            </div>
          ) : (
            renderChat()
          )}
        </div>

        {/* PC */}
        <div className="hidden md:flex w-full">
          <div className="w-60 border-r p-4">
            <div className="font-bold mb-2">회원 목록</div>
            {users.map((u) => (
              <div
                key={u.id}
                className="p-2 hover:bg-gray-200 cursor-pointer"
                onClick={() => setCurrentChatUser(u)}
              >
                {u.nickname}
              </div>
            ))}
          </div>

          <div className="flex-1 flex flex-col">
            {currentChatUser ? (
              renderChat()
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                채팅 상대 선택
              </div>
            )}
          </div>
        </div>

      </div>
    </PageContainer>
  );
}

/* ================= utils ================= */
const formatDate = (ts: any) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

const formatTime = (ts: any) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};