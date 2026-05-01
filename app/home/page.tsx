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
  where,
} from "firebase/firestore";
import { usePushSubscription } from "@/app/hooks/usePushSubscription"; // ← 추가

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

function SwipeUserItem({ u, isActive, isBlocked, isNotifOff, lastMessage, onClick, onBlock, onHide, onNotif }: any) {
  const BUTTON_WIDTH = 80;
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  
  const startX = useRef(0);
  const isDragging = useRef(false);
  const currentOffset = useRef(0);

  const onMoveStart = (clientX: number) => {
    startX.current = clientX - offset;
    isDragging.current = true;
  };

  const onMove = (clientX: number) => {
    if (!isDragging.current) return;
    const newOffset = Math.min(0, Math.max(-BUTTON_WIDTH, clientX - startX.current));
    setOffset(newOffset);
    currentOffset.current = newOffset;
  };

  const onMoveEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (!open) {
      if (currentOffset.current < -50) {
        setOffset(-BUTTON_WIDTH);
        setOpen(true);
      } else {
        setOffset(0);
      }
    } else {
      if (currentOffset.current > -50) {
        setOffset(0);
        setOpen(false);
      } else {
        setOffset(-BUTTON_WIDTH);
      }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl mb-2 select-none bg-gray-200">
      <div className="absolute right-0 top-0 h-full flex" style={{ width: BUTTON_WIDTH }}>
        <button onClick={(e) => { e.stopPropagation(); onBlock(); setOffset(0); setOpen(false); }} className={`flex-1 flex flex-col items-center justify-center text-white text-xs gap-1 ${isBlocked ? "bg-green-500" : "bg-red-500"}`}>
          <span>{isBlocked ? "✅" : "🚫"}</span><span>차단</span>
        </button>
      </div>

      <div
        className={`relative z-10 p-2 bg-white flex justify-between items-center cursor-pointer ${isActive ? "bg-gray-300" : "hover:bg-gray-200"}`}
        style={{ 
          transform: `translateX(${offset}px)`,
          transition: isDragging.current ? "none" : "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)" 
        }}
        onMouseDown={(e) => onMoveStart(e.clientX)}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseUp={onMoveEnd}
        onMouseLeave={onMoveEnd}
        onTouchStart={(e) => onMoveStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onMoveEnd}
        onClick={() => {
          if (open) { 
            setOffset(0); 
            setOpen(false); 
            currentOffset.current = 0;
          } else if (offset === 0) {
            onClick();
          }
        }}
      >
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="font-bold text-gray-800">{u.nickname}</div>
          <div className="text-xs text-gray-400 truncate">{lastMessage || "대화 없음"}</div>
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentChatUser, setCurrentChatUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [notifOff, setNotifOff] = useState<any[]>([]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [userVipMap, setUserVipMap] = useState<Record<string, boolean>>({});

  const [aiSummaryOn, setAiSummaryOn] = useState(false);
  useEffect(() => {
    setAiSummaryOn(localStorage.getItem("ai_summary") === "true");
  }, []);

  const [summary, setSummary] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});
  const isInitialLoad = useRef(true);

  const { isSubscribed, toggle } = usePushSubscription(nickname);

  /* 🔔 앱 내 알림음 (브라우저 열려있을 때) */
  const playNotificationSound = () => {
    const audio = new Audio("/sounds/alert1.mp3");
    audio.play();
  };

  const blockUser = async (targetNickname: string, targetId: string) => {
    const exist = blocked.find((b) => b.target_id === targetId);
    if (exist) {
      await deleteDoc(doc(db, "blocked", exist.id));
      alert("차단 해제");
      return;
    }
    await addDoc(collection(db, "blocked"), {
      user_id: nickname,
      target_id: targetId,
      target_name: targetNickname,
      createdAt: serverTimestamp(),
    });
    alert("차단 완료");
  };

  const hideUser = async (targetNickname: string, targetId: string) => {
    await addDoc(collection(db, "hidden"), {
      user_id: nickname,
      target_id: targetId,
      target_name: targetNickname,
    });
    alert("숨김 완료");
  };

  const toggleNotif = async (targetNickname: string, targetId: string) => {
    const exist = notifOff.find((n) => n.target_id === targetId);
    if (exist) {
      await deleteDoc(doc(db, "notif_off", exist.id));
      return;
    }
    await addDoc(collection(db, "notif_off"), {
      user_id: nickname,
      target_id: targetId,
      target_name: targetNickname,
      createdAt: serverTimestamp(),
    });
  };

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

  useEffect(() => {
    const unsub = watchAuthState((user) => {
      if (user) setNickname(user.displayName || "유저");
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "blocked"), where("user_id", "==", nickname));
    return onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setBlocked(list);
    });
  }, [nickname]);

  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "notif_off"), where("user_id", "==", nickname));
    return onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setNotifOff(list);
    });
  }, [nickname]);

  const isBlocked = (id: string) => blocked.some((b) => b.target_id === id);

  useEffect(() => {
    if (!nickname) return;
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const list: User[] = [];
      const vipMap: Record<string, boolean> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        list.push({ id: d.id, nickname: data.nickname });
        vipMap[data.nickname] = data.isVip === true;
      });
      setUsers(list.filter((u) => u.nickname !== nickname));
      setUserVipMap(vipMap);
    };
    fetchUsers();
  }, [nickname]);

  useEffect(() => {
    if (!currentChatUser || !nickname) return;
    isInitialLoad.current = true;
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
        if (m.from !== nickname && !isInitialLoad.current) {
          playNotificationSound();
        }
      }
      isInitialLoad.current = false;
      setMessages(msgs);
      setLastMessages((prev) => ({ ...prev, [currentChatUser.id]: lastMsg }));
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });
    return () => unsub();
  }, [currentChatUser, nickname]);

  /* 메시지 전송 - 푸시 알림 호출 추가 */
  const sendMessage = async () => {
    if (!input.trim() || !nickname || !currentChatUser) return;

    await addDoc(collection(db, "messages"), {
      from: nickname,
      to: currentChatUser.nickname,
      content: input.trim(),
      createdAt: serverTimestamp(),
      readBy: [nickname],
    });

    /* 🔔 푸시 알림 전송 (상대방이 앱 밖에 있을 때) */
    fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toNickname: currentChatUser.nickname,
        fromNickname: nickname,
        message: input.trim(),
      }),
    }).catch(() => {}); // 실패해도 채팅엔 영향 없음

    setInput("");
    setIsTyping(false);
  };

  const deleteMessage = async (id: string) => {
    await deleteDoc(doc(db, "messages", id));
    setSelectedMsgId(null);
  };

  const editMessage = async (id: string) => {
    const text = prompt("수정할 내용");
    if (!text) return;
    await updateDoc(doc(db, "messages", id), { content: text });
    setSelectedMsgId(null);
  };

  const isMyVIP = userVipMap[nickname || ""] === true;

  if (!nickname) return <div>로딩중...</div>;

  const renderChat = () => (
    <>
      {aiSummaryOn && summary && (
        <div className="p-3 bg-yellow-50 border text-sm">
          🧠 {summary}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages
          .filter(m => !isBlocked(currentChatUser?.id || ""))
          .map((m, i) => {
            const currentDate = formatDateLabel(m.createdAt);
            const prevDate = i > 0 ? formatDateLabel(messages[i - 1].createdAt) : null;
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
                  <div className={`flex flex-col max-w-xs ${isMine ? "self-end items-end" : "self-start items-start"}`}>
                    {showUser && (
                      <div className="text-xs mb-1 flex items-center gap-1">
                        <span className={isVIP ? "text-yellow-600 font-semibold" : ""}>{m.from}</span>
                        {isVIP && <span className="text-[10px] bg-yellow-400 text-white px-1 rounded">VIP</span>}
                      </div>
                    )}
                    <div className={`px-3 py-2 rounded-2xl ${isMine ? isVIP ? "bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-400" : "bg-red-100" : "bg-gray-200"}`}>
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
                    <div className="text-[10px] text-gray-400">{formatTime(m.createdAt)}</div>
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
          onChange={(e) => { setInput(e.target.value); setIsTyping(true); }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="메시지 입력"
        />
        <button onClick={sendMessage} className="px-4 py-2 bg-yellow-200 rounded-xl">전송</button>
        {!isMyVIP && (
          <button onClick={() => router.push("/vip")} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow">
            VIP 구매
          </button>
        )}
        {isMyVIP && aiSummaryOn && (
          <button onClick={runSummary} className="px-4 py-2 bg-blue-500 text-white rounded-xl">채팅 요약</button>
        )}
      </div>
    </>
  );

  if (isMobile) {
    if (!currentChatUser) {
      return (
        <PageContainer>
          <div className="h-screen p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl font-bold">회원 목록</div>
              <button
                onClick={toggle}
                className="text-sm px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {isSubscribed ? "🔕 알림 끄기" : "🔔 알림 허용"}
              </button>
            </div>
            {users.map((u) => (
              <SwipeUserItem
                key={u.id}
                u={u}
                isActive={currentChatUser === u}
                isBlocked={isBlocked(u.id)}
                isNotifOff={notifOff.some((n) => n.target_id === u.id)}
                lastMessage={lastMessages[u.id]}
                onClick={() => setCurrentChatUser(u)}
                onBlock={() => blockUser(u.nickname, u.id)}
                onHide={() => hideUser(u.nickname, u.id)}
                onNotif={() => toggleNotif(u.nickname, u.id)}
              />
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
            <div className="font-bold">{currentChatUser.nickname}</div>
          </div>
          <div className="flex-1 flex flex-col">{renderChat()}</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="h-screen flex">
        <div className="w-60 border-r p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold">회원 목록</div>
            <button
              onClick={toggle}
              className="text-xs px-2 py-1 bg-gray-100 rounded-lg hover:bg-gray-200"
              title={isSubscribed ? "알림 끄기" : "알림 허용"}
            >
              {isSubscribed ? "🔕" : "🔔"}
            </button>
          </div>
          {users.map((u) => (
            <SwipeUserItem
              key={u.id}
              u={u}
              isActive={currentChatUser?.id === u.id}
              isBlocked={isBlocked(u.id)}
              isNotifOff={notifOff.some((n) => n.target_id === u.id)}
              lastMessage={lastMessages[u.id]}
              onClick={() => setCurrentChatUser(u)}
              onBlock={() => blockUser(u.nickname, u.id)}
              onHide={() => hideUser(u.nickname, u.id)}
              onNotif={() => toggleNotif(u.nickname, u.id)}
            />
          ))}
        </div>
        <div className="flex-1 flex flex-col">
          {currentChatUser ? renderChat() : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              채팅 상대를 선택해 주세요☺️
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

const formatTime = (ts: any) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
};

const formatDateLabel = (ts: any) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("ko-KR");
};