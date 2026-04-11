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

  // 🔔 알림 권한 요청
  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  /* 로그인 */
  useEffect(() => {
    const unsub = watchAuthState(async (user) => {
      if (user) {
        setNickname(user.displayName || "유저");
        // Firestore에서 내 전화번호 가져오기
        const userDoc = await getDocs(
          query(collection(db, "users"), where("id", "==", user.uid))
        );
        userDoc.forEach((docSnap) => {
          setPhoneNumber(docSnap.data().phoneNumber);
        });
      }
    });
    return () => unsub();
  }, []);

  /* 주소록 매칭 */
  useEffect(() => {
    if (!phoneNumber) return;

    // 예시: 내 폰 주소록을 직접 배열로 관리 (실제 앱에서는 기기 주소록을 불러와야 함)
    const myContacts = ["010-1111-2222", "010-3333-4444"];

    const fetchContacts = async () => {
      const q = query(collection(db, "users"), where("phoneNumber", "in", myContacts));
      const snap = await getDocs(q);
      const list: User[] = snap.docs.map((d) => ({
        id: d.id,
        nickname: d.data().nickname,
        phoneNumber: d.data().phoneNumber,
      }));
      setContacts(list);
    };

    fetchContacts();
  }, [phoneNumber]);

  /* 메시지 */
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

      // 🔔 알림 처리
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const id = change.doc.id;

          if (
            data.user !== nickname &&
            Notification.permission === "granted" &&
            document.hidden &&
            id !== lastNotifiedId.current
          ) {
            lastNotifiedId.current = id;
            new Notification(data.user, {
              body: data.content,
              icon: "/favicon.ico",
            });
          }
        }
      });

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });

    return () => unsub();
  }, [currentChat, phoneNumber]);

  /* 읽음 처리 */
  const markAsRead = async (msg: Message) => {
    if (!nickname || !phoneNumber) return;
    if (msg.readBy?.includes(phoneNumber)) return;

    await updateDoc(doc(db, "messages", msg.id), {
      readBy: [...(msg.readBy || []), phoneNumber],
    });
  };

  /* 메시지 보내기 */
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

  /* 메시지 삭제 */
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

        {/* 채팅 */}
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

          {/* 입력 */}
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

/* 날짜/시간 포맷 함수 */
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
