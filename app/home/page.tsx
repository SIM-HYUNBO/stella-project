"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "../../components/PageContainer";
import { db, storage } from "@/app/firebase";
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
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { usePushSubscription } from "@/app/hooks/usePushSubscription";

type ReplyTo = {
  id: string;
  from: string;
  content: string;
  type?: string;
};

type Message = {
  id: string;
  from: string;
  to: string;
  content: string;
  type?: "text" | "image";
  createdAt?: any;
  readBy?: string[];
  replyTo?: ReplyTo;
  reactions?: Record<string, string[]>;
};

type User = {
  id: string;
  nickname: string;
};

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

function SwipeUserItem({
  u,
  isActive,
  isBlocked,
  lastMessage,
  unreadCount,
  isOnline,
  onClick,
  onBlock,
}: any) {
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
      if (currentOffset.current < -50) { setOffset(-BUTTON_WIDTH); setOpen(true); }
      else setOffset(0);
    } else {
      if (currentOffset.current > -50) { setOffset(0); setOpen(false); }
      else setOffset(-BUTTON_WIDTH);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl mb-2 select-none bg-gray-200">
      <div className="absolute right-0 top-0 h-full flex" style={{ width: BUTTON_WIDTH }}>
        <button
          onClick={(e) => { e.stopPropagation(); onBlock(); setOffset(0); setOpen(false); }}
          className={`flex-1 flex flex-col items-center justify-center text-white text-xs gap-1 ${isBlocked ? "bg-green-500" : "bg-red-500"}`}
        >
          <span>{isBlocked ? "✅" : "🚫"}</span><span>차단</span>
        </button>
      </div>
      <div
        className={`relative z-10 p-2 bg-white flex justify-between items-center cursor-pointer ${isActive ? "bg-gray-300" : "hover:bg-gray-200"}`}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging.current ? "none" : "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
        onMouseDown={(e) => onMoveStart(e.clientX)}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseUp={onMoveEnd}
        onMouseLeave={onMoveEnd}
        onTouchStart={(e) => onMoveStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onMoveEnd}
        onClick={() => {
          if (open) { setOffset(0); setOpen(false); currentOffset.current = 0; }
          else if (offset === 0) onClick();
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pointer-events-none">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-gray-600">
              {u.nickname[0]}
            </div>
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? "bg-green-400" : "bg-gray-400"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-800 text-sm">{u.nickname}</div>
            <div className="text-xs text-gray-400 truncate">{lastMessage || "대화 없음"}</div>
          </div>
        </div>
        {unreadCount > 0 && (
          <div className="pointer-events-none ml-2 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shrink-0">
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Chat() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [currentChatUser, setCurrentChatUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [notifOff, setNotifOff] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [userVipMap, setUserVipMap] = useState<Record<string, boolean>>({});
  const [aiSummaryOn, setAiSummaryOn] = useState(false);
  const [summary, setSummary] = useState("");
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});
  const isInitialLoad = useRef(true);
  const { isSubscribed, isBlocked, toggle } = usePushSubscription(nickname);

  // 필수 기능 state
  const [peerTyping, setPeerTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [msgSearch, setMsgSearch] = useState("");
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nicknameRef = useRef<string | null>(null);

  // 컨텍스트 메뉴
  type CtxMenu = { msgId: string; x: number; y: number; isMine: boolean; msg: Message } | null;
  const [ctxMenu, setCtxMenu] = useState<CtxMenu>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { nicknameRef.current = nickname; }, [nickname]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { setAiSummaryOn(localStorage.getItem("ai_summary") === "true"); }, []);

  const playNotificationSound = () => {
    const audio = new Audio("/sounds/alert1.mp3");
    audio.play().catch(() => {});
  };

  // 온라인 상태 등록 및 리스닝
  useEffect(() => {
    if (!nickname) return;
    const presRef = doc(db, "presence", nickname);
    setDoc(presRef, { isOnline: true, lastSeen: serverTimestamp() });

    const handleUnload = () => {
      // sendBeacon은 API route 없이도 Firestore REST API로 직접 호출 가능하나,
      // React 클린업으로 대부분 커버됨
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      setDoc(presRef, { isOnline: false, lastSeen: serverTimestamp() });
    };
  }, [nickname]);

  useEffect(() => {
    if (!nickname) return;
    return onSnapshot(collection(db, "presence"), (snap) => {
      const online = new Set<string>();
      snap.docs.forEach((d) => { if (d.data().isOnline) online.add(d.id); });
      setOnlineUsers(online);
    });
  }, [nickname]);

  // 타이핑 인디케이터 리스닝
  useEffect(() => {
    if (!currentChatUser || !nickname) { setPeerTyping(false); return; }
    const key = `${currentChatUser.nickname}_to_${nickname}`;
    return onSnapshot(doc(db, "typing", key), (snap) => {
      if (!snap.exists()) { setPeerTyping(false); return; }
      const data = snap.data();
      const updated = data.updatedAt?.toDate?.();
      const isRecent = updated && Date.now() - updated.getTime() < 5000;
      setPeerTyping(data.isTyping && isRecent);
    });
  }, [currentChatUser, nickname]);

  // 채팅 전환 시 이전 타이핑 상태 초기화
  useEffect(() => {
    const prevUser = currentChatUser;
    return () => {
      const nick = nicknameRef.current;
      if (nick && prevUser) {
        setDoc(doc(db, "typing", `${nick}_to_${prevUser.nickname}`), {
          isTyping: false, updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    };
  }, [currentChatUser]);

  // 안 읽은 메시지 카운트
  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "messages"), where("to", "==", nickname));
    return onSnapshot(q, (snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (!(data.readBy || []).includes(nickname)) {
          counts[data.from] = (counts[data.from] || 0) + 1;
        }
      });
      setUnreadCounts(counts);
    });
  }, [nickname]);

  const updateTyping = useCallback(
    async (isTyping: boolean) => {
      if (!nicknameRef.current || !currentChatUser) return;
      const key = `${nicknameRef.current}_to_${currentChatUser.nickname}`;
      await setDoc(doc(db, "typing", key), {
        from: nicknameRef.current,
        to: currentChatUser.nickname,
        isTyping,
        updatedAt: serverTimestamp(),
      });
    },
    [currentChatUser]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    updateTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => updateTyping(false), 2000);
  };

  const blockUser = async (targetNickname: string, targetId: string) => {
    const exist = blocked.find((b) => b.target_id === targetId);
    if (exist) { await deleteDoc(doc(db, "blocked", exist.id)); alert("차단 해제"); return; }
    await addDoc(collection(db, "blocked"), {
      user_id: nickname, target_id: targetId, target_name: targetNickname, createdAt: serverTimestamp(),
    });
    alert("차단 완료");
  };

  const hideUser = async (targetNickname: string, targetId: string) => {
    await addDoc(collection(db, "hidden"), { user_id: nickname, target_id: targetId, target_name: targetNickname });
    alert("숨김 완료");
  };

  const toggleNotif = async (targetNickname: string, targetId: string) => {
    const exist = notifOff.find((n) => n.target_id === targetId);
    if (exist) { await deleteDoc(doc(db, "notif_off", exist.id)); return; }
    await addDoc(collection(db, "notif_off"), {
      user_id: nickname, target_id: targetId, target_name: targetNickname, createdAt: serverTimestamp(),
    });
  };

  const runSummary = async () => {
    if (!aiSummaryOn || !currentChatUser) return;
    const res = await fetch("/api/ai-summary", { method: "POST", body: JSON.stringify({ messages }) });
    const data = await res.json();
    setSummary(data.summary);
    await setDoc(doc(db, "chat_summaries", currentChatUser.id), { summary: data.summary, updatedAt: new Date() }, { merge: true });
  };

  useEffect(() => {
    const unsub = watchAuthState((user) => {
      if (user) setNickname(user.displayName || "유저");
      else router.replace("/login");
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
          id: d.id, from: data.from, to: data.to, content: data.content,
          type: data.type || "text", createdAt: data.createdAt,
          readBy: data.readBy || [], replyTo: data.replyTo, reactions: data.reactions || {},
        };
        const isMyChat =
          (m.from === nickname && m.to === currentChatUser.nickname) ||
          (m.from === currentChatUser.nickname && m.to === nickname);
        if (!isMyChat) continue;
        lastMsg = m.type === "image" ? "📷 사진" : m.content;
        if (m.from !== nickname && !m.readBy?.includes(nickname)) {
          await updateDoc(doc(db, "messages", m.id), { readBy: [...(m.readBy || []), nickname] });
          m.readBy = [...(m.readBy || []), nickname];
        }
        msgs.push(m);
        if (m.from !== nickname && !isInitialLoad.current) playNotificationSound();
      }
      isInitialLoad.current = false;
      setMessages(msgs);
      setLastMessages((prev) => ({ ...prev, [currentChatUser.id]: lastMsg }));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
    return () => unsub();
  }, [currentChatUser, nickname]);

  const sendMessage = async () => {
    if (!input.trim() || !nickname || !currentChatUser) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    updateTyping(false);
    const msgData: any = {
      from: nickname, to: currentChatUser.nickname, content: input.trim(),
      type: "text", createdAt: serverTimestamp(), readBy: [nickname],
    };
    if (replyTo) msgData.replyTo = replyTo;
    await addDoc(collection(db, "messages"), msgData);
    fetch("/api/push", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toNickname: currentChatUser.nickname, fromNickname: nickname, message: input.trim() }),
    }).catch(() => {});
    setInput("");
    setReplyTo(null);
  };

  const sendImage = async (file: File) => {
    if (!nickname || !currentChatUser) return;
    setImgUploading(true);
    try {
      const sRef = storageRef(storage, `chat-images/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(sRef, file);
      const url = await getDownloadURL(snapshot.ref);
      await addDoc(collection(db, "messages"), {
        from: nickname, to: currentChatUser.nickname, content: url,
        type: "image", createdAt: serverTimestamp(), readBy: [nickname],
        ...(replyTo ? { replyTo } : {}),
      });
      setReplyTo(null);
    } catch {
      alert("이미지 전송에 실패했습니다.");
    } finally {
      setImgUploading(false);
    }
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

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!nickname) return;
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    const reactions = { ...(msg.reactions || {}) };
    const users = reactions[emoji] || [];
    if (users.includes(nickname)) {
      const newUsers = users.filter((u) => u !== nickname);
      if (newUsers.length === 0) delete reactions[emoji];
      else reactions[emoji] = newUsers;
    } else {
      reactions[emoji] = [...users, nickname];
    }
    await updateDoc(doc(db, "messages", msgId), { reactions });
    setCtxMenu(null);
  };

  const openCtxMenu = (e: React.MouseEvent | React.TouchEvent, m: Message, isMine: boolean) => {
    let x: number, y: number;
    if ("touches" in e) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      (e as React.MouseEvent).preventDefault();
      x = (e as React.MouseEvent).clientX;
      y = (e as React.MouseEvent).clientY;
    }
    const popupW = 160;
    const popupH = 180;
    const adjX = Math.min(x, window.innerWidth - popupW - 8);
    const adjY = y + popupH > window.innerHeight ? y - popupH : y + 8;
    setCtxMenu({ msgId: m.id, x: adjX, y: adjY, isMine, msg: m });
  };

  const handleTouchStart = (e: React.TouchEvent, m: Message, isMine: boolean) => {
    longPressTimer.current = setTimeout(() => openCtxMenu(e, m, isMine), 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const isMyVIP = userVipMap[nickname || ""] === true;

  const filteredUsers = userSearch.trim()
    ? users.filter((u) => u.nickname.toLowerCase().includes(userSearch.toLowerCase()))
    : users;

  const displayedMessages = msgSearch.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(msgSearch.toLowerCase()))
    : messages;

  if (!nickname) return <div className="flex items-center justify-center h-screen">로딩중...</div>;

  const renderMsgContent = (m: Message) => {
    if (m.type === "image") {
      return (
        <img
          src={m.content} alt="이미지"
          className="max-w-[200px] max-h-[200px] rounded-xl object-cover cursor-pointer"
          onClick={(e) => { e.stopPropagation(); window.open(m.content, "_blank"); }}
        />
      );
    }
    return <span className="break-words whitespace-pre-wrap">{m.content}</span>;
  };

  const renderChat = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 채팅 헤더 */}
      {currentChatUser && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-white shrink-0">
          <div className="flex items-center gap-2">
            {isMobile && (
              <button onClick={() => setCurrentChatUser(null)} className="mr-1 text-gray-500 hover:text-gray-700">←</button>
            )}
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                {currentChatUser.nickname[0]}
              </div>
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${onlineUsers.has(currentChatUser.nickname) ? "bg-green-400" : "bg-gray-400"}`} />
            </div>
            <div>
              <div className="font-bold text-sm">{currentChatUser.nickname}</div>
              <div className="text-xs text-gray-400">{onlineUsers.has(currentChatUser.nickname) ? "온라인" : "오프라인"}</div>
            </div>
          </div>
          <button
            onClick={() => { setShowMsgSearch((p) => !p); setMsgSearch(""); }}
            className="text-gray-400 hover:text-blue-500 text-lg"
            title="메시지 검색"
          >🔍</button>
        </div>
      )}

      {aiSummaryOn && summary && (
        <div className="p-3 bg-yellow-50 border-b text-sm shrink-0">🧠 {summary}</div>
      )}

      {showMsgSearch && (
        <div className="px-4 py-2 border-b shrink-0">
          <input
            className="w-full border rounded-xl px-3 py-1 text-sm"
            placeholder="메시지 검색..."
            value={msgSearch}
            onChange={(e) => setMsgSearch(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* 타이핑 인디케이터 */}
      {peerTyping && (
        <div className="px-4 py-1 shrink-0">
          <span className="text-xs text-gray-400 italic">{currentChatUser?.nickname}님이 입력 중...</span>
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-1"
        onClick={() => setCtxMenu(null)}
      >
        {displayedMessages
          .filter(() => !isBlocked(currentChatUser?.id || ""))
          .map((m, i) => {
            const currentDate = formatDateLabel(m.createdAt);
            const prevDate = i > 0 ? formatDateLabel(displayedMessages[i - 1].createdAt) : null;
            const showDate = currentDate !== prevDate;
            const prev = displayedMessages[i - 1];
            const showUser = !prev || prev.from !== m.from;
            const isMine = m.from === nickname;
            const isVIP = userVipMap[m.from] === true;

            return (
              <div key={m.id}>
                {showDate && (
                  <div className="flex items-center justify-center text-xs text-gray-400 w-full my-2">
                    <div className="flex-1 border-t" />
                    <span className="px-2">{currentDate}</span>
                    <div className="flex-1 border-t" />
                  </div>
                )}
                <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`flex items-end gap-1 max-w-[75%] ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                      {showUser && !isMine && (
                        <div className="text-xs mb-1 flex items-center gap-1">
                          <span className={isVIP ? "text-yellow-600 font-semibold" : "text-gray-600"}>{m.from}</span>
                          {isVIP && <span className="text-[10px] bg-yellow-400 text-white px-1 rounded">VIP</span>}
                        </div>
                      )}

                      {m.replyTo && (
                        <div className="text-xs mb-1 px-2 py-1 rounded-lg border-l-2 border-blue-400 bg-blue-50 max-w-[200px]">
                          <span className="font-semibold text-blue-600">{m.replyTo.from}</span>:{" "}
                          <span className="text-gray-500 truncate">
                            {m.replyTo.type === "image" ? "📷 사진" : m.replyTo.content}
                          </span>
                        </div>
                      )}

                      <div
                        className={`px-3 py-2 text-sm cursor-pointer select-none ${isMine
                          ? isVIP
                            ? "bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-300 rounded-2xl"
                            : "bg-red-100 rounded-2xl"
                          : "bg-gray-200 rounded-2xl"
                        }`}
                        onContextMenu={(e) => openCtxMenu(e, m, isMine)}
                        onTouchStart={(e) => handleTouchStart(e, m, isMine)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchEnd}
                      >
                        {renderMsgContent(m)}
                      </div>

                      {m.reactions && Object.keys(m.reactions).length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {Object.entries(m.reactions).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              onClick={(e) => { e.stopPropagation(); toggleReaction(m.id, emoji); }}
                              className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${users.includes(nickname!) ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-gray-100 border-gray-300 text-gray-600"}`}
                            >
                              {emoji} {users.length}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-1 mt-0.5">
                        {isMine && (
                          <span className="text-[10px] text-gray-400">
                            {(m.readBy?.length ?? 0) > 1 ? "0" : "1"}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">{formatTime(m.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-t text-sm shrink-0">
          <div className="w-0.5 h-8 bg-blue-400 rounded shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-blue-600 text-xs">{replyTo.from}</div>
            <div className="text-gray-500 text-xs truncate">
              {replyTo.type === "image" ? "📷 사진" : replyTo.content}
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 shrink-0">✕</button>
        </div>
      )}

      <div className="flex border-t p-3 gap-2 items-center shrink-0 bg-white">
        <button
          onClick={() => imageInputRef.current?.click()}
          className={`text-xl shrink-0 transition-colors ${imgUploading ? "text-gray-300 animate-pulse" : "text-gray-400 hover:text-blue-500"}`}
          title="사진 전송"
          disabled={imgUploading}
        >
          📷
        </button>
        <input
          type="file" ref={imageInputRef} accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = ""; }}
        />
        <input
          className="flex-1 border rounded-xl px-3 py-2 text-sm"
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="메시지 입력"
        />
        <button onClick={sendMessage} className="w-9 h-9 flex items-center justify-center bg-yellow-300 hover:bg-yellow-400 rounded-full shrink-0 transition-all shadow-sm active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
        {isMyVIP && aiSummaryOn && (
          <button onClick={runSummary} className="px-3 py-2 bg-blue-500 text-white rounded-xl text-sm shrink-0">요약</button>
        )}
      </div>

      {/* 컨텍스트 메뉴 팝업 */}
      {ctxMenu && (
        <div
          className="fixed z-50"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden w-40">
            {/* 리액션 행 */}
            <div className="flex justify-around px-2 py-2 border-b border-gray-100">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(ctxMenu.msgId, emoji)}
                  className="text-lg hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
            {/* 액션 목록 */}
            <button
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
              onClick={() => {
                setReplyTo({ id: ctxMenu.msg.id, from: ctxMenu.msg.from, content: ctxMenu.msg.content, type: ctxMenu.msg.type });
                setCtxMenu(null);
              }}
            >
              <span className="text-base">↩</span> 답장
            </button>
            {ctxMenu.isMine && (
              <>
                <button
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => { editMessage(ctxMenu.msgId); setCtxMenu(null); }}
                >
                  <span className="text-base">✏️</span> 수정
                </button>
                <button
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                  onClick={() => { deleteMessage(ctxMenu.msgId); setCtxMenu(null); }}
                >
                  <span className="text-base">🗑️</span> 삭제
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderUserList = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="font-bold text-gray-800">채팅</div>
        <button
          onClick={toggle}
          className="text-sm px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {isSubscribed ? "🔕" : "🔔"}
        </button>
      </div>

      {isBlocked && (
        <div className="mx-3 mt-2 mb-1 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 shrink-0">
          알림이 차단되어 있어요.<br />
          <span className="font-semibold">Chrome: 주소창 🔒 → 알림 → 허용</span><br />
          <span className="font-semibold">앱: 설정 → 앱 → WAGIE → 알림 → 허용</span>
        </div>
      )}

      <div className="px-3 py-2 border-b shrink-0">
        <input
          className="w-full border rounded-xl px-3 py-1.5 text-sm"
          placeholder="사용자 검색..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filteredUsers.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-4">
            {userSearch ? "검색 결과 없음" : "등록된 사용자 없음"}
          </div>
        )}
        {filteredUsers.map((u) => (
          <SwipeUserItem
            key={u.id}
            u={u}
            isActive={currentChatUser?.id === u.id}
            isBlocked={isBlocked(u.id)}
            isNotifOff={notifOff.some((n) => n.target_id === u.id)}
            lastMessage={lastMessages[u.id]}
            unreadCount={unreadCounts[u.nickname] || 0}
            isOnline={onlineUsers.has(u.nickname)}
            onClick={() => setCurrentChatUser(u)}
            onBlock={() => blockUser(u.nickname, u.id)}
            onHide={() => hideUser(u.nickname, u.id)}
            onNotif={() => toggleNotif(u.nickname, u.id)}
          />
        ))}
      </div>
    </div>
  );

  if (isMobile) {
    if (!currentChatUser) {
      return (
        <PageContainer>
          <div className="h-screen flex flex-col">{renderUserList()}</div>
        </PageContainer>
      );
    }
    return (
      <PageContainer>
        <div className="h-screen flex flex-col">{renderChat()}</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="h-screen flex overflow-hidden">
        <div className="w-64 border-r flex flex-col">{renderUserList()}</div>
        <div className="flex-1 flex flex-col">
          {currentChatUser ? renderChat() : (
            <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-2">
              <div className="text-4xl">💬</div>
              <div>채팅 상대를 선택해 주세요</div>
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
