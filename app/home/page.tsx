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
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  getDoc,
  getDocs,
} from "firebase/firestore";

type Message = {
  id: string;
  user: string;
  content: string;
  createdAt?: any;
  readBy?: string[];
  participants: string[];
};

type User = {
  id: string;
  nickname: string;
  phoneNumber: string;
};

export default function Chat() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [contacts, setContacts] = useState<User[]>([]);
  const [currentChat, setCurrentChat] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastNotifiedId = useRef<string | null>(null);

  // 로그인 후 내 닉네임/전화번호 가져오기
  useEffect(() => {
    const unsub = watchAuthState(async (user) => {
      if (user) {
        setNickname(user.displayName || "유저");
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setPhoneNumber(userDoc.data().phoneNumber);
        }
      }
    });
    return () => unsub();
  }, []);

  // 내 주소록과 Firestore 매칭
  useEffect(() => {
    if (!phoneNumber) return;

    // 실제 앱에서는 기기 주소록 API로 가져온 번호 배열을 사용해야 함
    // 여기서는 Firestore에 등록된 모든 유저 중 내가 가진 번호만 필터링
    const fetchContacts = async () => {
      const snap = await getDocs(collection(db, "users"));
      const list: User[] = snap.docs
        .map((d) => ({
          id: d.id,
          nickname: d.data().nickname,
          phoneNumber: d.data().phoneNumber,
        }))
        .filter((u) => u.phoneNumber !== phoneNumber); // 자기 자신 제외
      setContacts(list);
    };

    fetchContacts();
  }, [phoneNumber]);

  // 메시지 구독
  useEffect(() => {
    if (!currentChat || !phoneNumber) return;

    const q = query(
      collection(db, "messages"),
      where("participants", "array-contains", phoneNumber),
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
          participants: d.data().participants,
        }))
        .filter((m) => m.participants.includes(currentChat.phoneNumber));

      setMessages(msgs);
      msgs.forEach(markAsRead);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });

    return () => unsub();
  }, [currentChat, phoneNumber]);

  // 읽음 처리
  const markAsRead = async (msg: Message) => {
    if (!phoneNumber) return;
    if (msg.readBy?.includes(phoneNumber)) return;
    await updateDoc(doc(db, "messages", msg.id), {
      readBy: [...(msg.readBy || []), phoneNumber],
    });
  };

  // 메시지 보내기
  const sendMessage = async () => {
    if (!input.trim() || !nickname || !phoneNumber || !currentChat) return;

    await addDoc(collection(db, "messages"), {
      participants: [phoneNumber, currentChat.phoneNumber],
      user: nickname,
      content: input.trim(),
      createdAt: serverTimestamp(),
      readBy: [phoneNumber],
    });

    setInput("");
  };

  // 메시지 삭제
  const deleteMessage = async (msg: Message) => {
    await deleteDoc(doc(db, "messages", msg.id));
  };

  if (!nickname) return <div>로딩중...</div>;

  return (
    <PageContainer>
      <div className="flex h-screen">
        {/* 사이드바 */}
        <div className="w-60 border-r p-4 flex flex-col gap-3 bg-amber-50">
          <div className="font-bold text-lg mb-2">내 연락처</div>
          {contacts.map((c) => (
            <div
              key={c.id}
              className={`p-2 rounded cursor-pointer ${
                currentChat?.id === c.id ? "bg-amber-200" : "hover:bg-amber-100"
              }`}
              onClick={() => setCurrentChat(c)}
            >
              {c.nickname}
            </div>
          ))}
        </div>

        {/* 채팅창 */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const showDate =
                !prev || formatDate(prev.createdAt) !== formatDate(m.createdAt);
              const showUser = !prev || prev.user !== m.user;

              return (
                <div key={m.id} className="flex flex-col">
                  {showDate && (
                    <div className="text-center text-xs text-gray-400 my-2">
                      {formatDate(m.createdAt)}
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
                      className={`px-3 py-2 rounded-xl ${
                        m.user === nickname ? "bg-amber-200" : "bg-gray-200"
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
          <div className="flex border-t p-3 gap-2 bg-white">
            <input
              className="flex-1 border rounded px-3 py-2"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="메시지 입력"
            />
            <button
              className="px-4 py-2 bg-amber-300 text-black rounded hover:bg-amber-400"
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
