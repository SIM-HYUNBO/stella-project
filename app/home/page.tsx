"use client";

import { useEffect, useState, useRef } from "react";
import PageContainer from "../../components/PageContainer";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  getDocs,
} from "firebase/firestore";

type Message = {
  id: string;
  user: string;
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 로그인
  useEffect(() => {
    const unsub = watchAuthState((user) => {
      if (user) setNickname(user.displayName || "유저");
    });
    return () => unsub();
  }, []);

  // 모든 유저 목록 불러오기 (자기 자신 제외)
  useEffect(() => {
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

  // 메시지 구독 (선택한 유저와의 대화)
  useEffect(() => {
    if (!currentChatUser || !nickname) return;

    const q = query(
      collection(db, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map((d) => ({
          id: d.id,
          user: d.data().user,
          content: d.data().content,
          createdAt: d.data().createdAt,
          readBy: d.data().readBy || [],
        }))
        .filter(
          (m) =>
            (m.user === nickname && m.readBy?.includes(currentChatUser.nickname)) ||
            (m.user === currentChatUser.nickname && m.readBy?.includes(nickname))
        );

      setMessages(msgs);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });

    return () => unsub();
  }, [currentChatUser, nickname]);

  // 메시지 보내기
  const sendMessage = async () => {
    if (!input.trim() || !nickname || !currentChatUser) return;

    await addDoc(collection(db, "messages"), {
      user: nickname,
      content: input.trim(),
      createdAt: serverTimestamp(),
      readBy: [nickname, currentChatUser.nickname],
    });

    setInput("");
  };

  if (!nickname) return <div>로딩중...</div>;

  return (
    <PageContainer>
      <div className="flex h-screen">
        {/* 사이드바: 모든 유저 닉네임 */}
        <div className="w-60 border-r p-4 flex flex-col gap-2">
          <div className="font-bold">회원 목록</div>
          {users.map((u) => (
            <div
              key={u.id}
              className={`p-2 rounded cursor-pointer ${
                currentChatUser?.id === u.id ? "bg-gray-300" : "hover:bg-gray-200"
              }`}
              onClick={() => setCurrentChatUser(u)}
            >
              {u.nickname}
            </div>
          ))}
        </div>

        {/* 채팅창 */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const showDate =
                !prev || formatDate(prev.createdAt) !== formatDate(m.createdAt);
              const showUser = !prev || prev.user !== m.user;

              return (
                <div key={m.id} className="flex flex-col">
                  {showDate && (
                    <div className="text-center text-xs text-gray-400 my-4">
                      ───── {formatDate(m.createdAt)} ─────
                    </div>
                  )}
                  <div
                    className={`flex flex-col max-w-xs ${
                      m.user === nickname
                        ? "self-end items-end"
                        : "self-start items-start"
                    }`}
                  >
                    {showUser && (
                      <div className="text-xs text-gray-500 mb-1">{m.user}</div>
                    )}
                    <div
                      className={`px-3 py-2 rounded-2xl ${
                        m.user === nickname ? "bg-red-100" : "bg-gray-200"
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

          {/* 입력창 */}
          <div className="flex border-t p-3 gap-2">
            <input
              className="flex-1 border rounded-xl px-3 py-2"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="메시지 입력"
            />
            <button
              className="px-4 py-2 bg-yellow-200 rounded-xl"
              onClick={sendMessage}
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

/* 날짜/시간 포맷 */
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
