"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  edited?: boolean;
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
  const BUTTON_WIDTH = 84;

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

    const newOffset = Math.min(
      0,
      Math.max(-BUTTON_WIDTH, clientX - startX.current)
    );

    setOffset(newOffset);
    currentOffset.current = newOffset;
  };

  const onMoveEnd = () => {
    if (!isDragging.current) return;

    isDragging.current = false;

    if (!open) {
      if (currentOffset.current < -40) {
        setOffset(-BUTTON_WIDTH);
        setOpen(true);
      } else {
        setOffset(0);
      }
    } else {
      if (currentOffset.current > -40) {
        setOffset(0);
        setOpen(false);
      } else {
        setOffset(-BUTTON_WIDTH);
      }
    }
  };
  

  return (
    <div className="relative overflow-hidden rounded-2xl mb-2">
      <div
        className="absolute right-0 top-0 h-full flex"
        style={{ width: BUTTON_WIDTH }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBlock();
            setOffset(0);
            setOpen(false);
          }}
          className={`w-full text-white text-xs font-semibold ${
            isBlocked
              ? "bg-emerald-500"
              : "bg-gradient-to-br from-red-500 to-pink-500"
          }`}
        >
          {isBlocked ? "해제" : "차단"}
        </button>
      </div>

      <div
        className={`relative z-10 px-3 py-3 bg-white border border-gray-100 shadow-sm cursor-pointer transition ${
          isActive
            ? "bg-gradient-to-r from-yellow-50 to-orange-50"
            : "hover:bg-gray-50"
        }`}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging.current
            ? "none"
            : "transform .25s ease",
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
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-300 to-orange-300 flex items-center justify-center text-sm font-bold text-white shadow">
              {u.nickname[0]}
            </div>

            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                isOnline ? "bg-green-400" : "bg-gray-300"
              }`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-800 truncate">
              {u.nickname}
            </div>

            <div className="text-xs text-gray-400 truncate">
              {lastMessage || "대화 없음"}
            </div>
          </div>

          {unreadCount > 0 && (
            <div className="min-w-[22px] h-[22px] px-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold shadow">
              {unreadCount > 99 ? "99+" : unreadCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const router = useRouter();

  const [nickname, setNickname] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [currentChatUser, setCurrentChatUser] =
    useState<User | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");

  const [blocked, setBlocked] = useState<any[]>([]);

  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(
    new Set()
  );

  const [unreadCounts, setUnreadCounts] = useState<
    Record<string, number>
  >({});

  const [lastMessages, setLastMessages] = useState<
    Record<string, string>
  >({});

  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
    const [friendIds, setFriendIds] = useState<Set<string>>(new Set());

  const [peerTyping, setPeerTyping] = useState(false);

  const [msgSearch, setMsgSearch] = useState("");
  const [showMsgSearch, setShowMsgSearch] = useState(false);

  const [imgUploading, setImgUploading] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  const [ctxMenu, setCtxMenu] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const nicknameRef = useRef<string | null>(null);

  const { isSubscribed, isBlocked: pushBlocked, toggle } =
    usePushSubscription(nickname);

  useEffect(() => {
    nicknameRef.current = nickname;
  }, [nickname]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);

    check();

    window.addEventListener("resize", check);

    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const unsub = watchAuthState((user) => {
      if (user) {
        setNickname(user.displayName || "유저");
      } else {
        router.replace("/login");
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!nickname) return;

    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));

      const list: User[] = [];

      snap.docs.forEach((d) => {
        const data = d.data();

        list.push({
          id: d.id,
          nickname: data.nickname,
        });
      });

      setUsers(list.filter((u) => u.nickname !== nickname));
    };

    fetchUsers();
  }, [nickname]);

  useEffect(() => {
    if (!nickname) return;

    const q = query(
      collection(db, "blocked"),
      where("user_id", "==", nickname)
    );

    return onSnapshot(q, (snap) => {
      const list: any[] = [];

      snap.forEach((d) => {
        list.push({
          id: d.id,
          ...d.data(),
        });
      });

      setBlocked(list);
    });
  }, [nickname]);

  useEffect(() => {
    if (!nickname) return;

    const presRef = doc(db, "presence", nickname);

    setDoc(presRef, {
      isOnline: true,
      lastSeen: serverTimestamp(),
    });

    return () => {
      setDoc(presRef, {
        isOnline: false,
        lastSeen: serverTimestamp(),
      });
    };
  }, [nickname]);

  useEffect(() => {
    return onSnapshot(collection(db, "presence"), (snap) => {
      const online = new Set<string>();

      snap.docs.forEach((d) => {
        if (d.data().isOnline) {
          online.add(d.id);
        }
      });

      setOnlineUsers(online);
    });
  }, []);

  useEffect(() => {
    if (!nickname) return;

    const q = query(
      collection(db, "messages"),
      where("to", "==", nickname)
    );

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
  useEffect(() => {
  if (!nickname) return;

  const fetchFriends = async () => {
    const snap = await getDocs(collection(db, "friends"));

    const set = new Set<string>();

    snap.docs.forEach((d) => {
      const data = d.data();

      // 내가 친구인 사람만
      if (data.user_id === nickname) {
        set.add(data.friend_id);
      }
    });

    setFriendIds(set);
  };

  fetchFriends();
}, [nickname]);

  useEffect(() => {
    if (!currentChatUser || !nickname) {
      setPeerTyping(false);
      return;
    }

    const key = `${currentChatUser.nickname}_to_${nickname}`;

    return onSnapshot(doc(db, "typing", key), (snap) => {
      if (!snap.exists()) {
        setPeerTyping(false);
        return;
      }

      const data = snap.data();

      const updated = data.updatedAt?.toDate?.();

      const isRecent =
        updated && Date.now() - updated.getTime() < 5000;

      setPeerTyping(data.isTyping && isRecent);
    });
  }, [currentChatUser, nickname]);

  useEffect(() => {
    if (!currentChatUser || !nickname) return;

    const q = query(
      collection(db, "messages"),
      orderBy("createdAt", "asc")
    );

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
          type: data.type || "text",
          createdAt: data.createdAt,
          readBy: data.readBy || [],
          replyTo: data.replyTo,
          reactions: data.reactions || {},
          edited: data.edited || false,
        };

        const isMyChat =
          (m.from === nickname &&
            m.to === currentChatUser.nickname) ||
          (m.from === currentChatUser.nickname &&
            m.to === nickname);

        if (!isMyChat) continue;

        lastMsg =
          m.type === "image" ? "📷 사진" : m.content;

        if (
          m.from !== nickname &&
          !m.readBy?.includes(nickname)
        ) {
          await updateDoc(doc(db, "messages", m.id), {
            readBy: [...(m.readBy || []), nickname],
          });

          m.readBy = [...(m.readBy || []), nickname];
        }

        msgs.push(m);
      }

      setMessages(msgs);

      setLastMessages((prev) => ({
        ...prev,
        [currentChatUser.id]: lastMsg,
      }));

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      }, 50);
    });

    return () => unsub();
  }, [currentChatUser, nickname]);

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setInput(e.target.value);

    updateTyping(true);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      updateTyping(false);
    }, 2000);
  };

  const sendMessage = async () => {
    if (!input.trim() || !nickname || !currentChatUser)
      return;

    updateTyping(false);

    const msgData: any = {
      from: nickname,
      to: currentChatUser.nickname,
      content: input.trim(),
      type: "text",
      createdAt: serverTimestamp(),
      readBy: [nickname],
    };

    if (replyTo) {
      msgData.replyTo = replyTo;
    }

    await addDoc(collection(db, "messages"), msgData);

    setInput("");
    setReplyTo(null);
  };

  const compressToBase64 = (
    file: File
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();

      const url = URL.createObjectURL(file);

      img.onload = () => {
        const maxPx = 800;

        const ratio = Math.min(
          maxPx / img.width,
          maxPx / img.height,
          1
        );

        const canvas = document.createElement("canvas");

        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        canvas
          .getContext("2d")
          ?.drawImage(img, 0, 0, canvas.width, canvas.height);

        URL.revokeObjectURL(url);

        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("이미지 로드 실패"));
      };

      img.src = url;
    });

  const sendImage = async (file: File) => {
    if (!nickname || !currentChatUser) return;

    setImgUploading(true);

    try {
      const base64 = await compressToBase64(file);

      await addDoc(collection(db, "messages"), {
        from: nickname,
        to: currentChatUser.nickname,
        content: base64,
        type: "image",
        createdAt: serverTimestamp(),
        readBy: [nickname],
      });
    } finally {
      setImgUploading(false);
    }
  };

  const deleteMessage = async (id: string) => {
    await deleteDoc(doc(db, "messages", id));
    setCtxMenu(null);
  };

  const editMessage = async (id: string) => {
    const text = prompt("수정할 메시지");

    if (!text) return;

    await updateDoc(doc(db, "messages", id), {
      content: text,
      edited: true,
    });

    setCtxMenu(null);
  };

  const toggleReaction = async (
    msgId: string,
    emoji: string
  ) => {
    if (!nickname) return;

    const msg = messages.find((m) => m.id === msgId);

    if (!msg) return;

    const reactions = { ...(msg.reactions || {}) };

    const users = reactions[emoji] || [];

    if (users.includes(nickname)) {
      const newUsers = users.filter((u) => u !== nickname);

      if (newUsers.length === 0) {
        delete reactions[emoji];
      } else {
        reactions[emoji] = newUsers;
      }
    } else {
      reactions[emoji] = [...users, nickname];
    }

    await updateDoc(doc(db, "messages", msgId), {
      reactions,
    });

    setCtxMenu(null);
  };

  const blockUser = async (
    targetNickname: string,
    targetId: string
  ) => {
    const exist = blocked.find(
      (b) => b.target_id === targetId
    );

    if (exist) {
      await deleteDoc(doc(db, "blocked", exist.id));
      return;
    }

    await addDoc(collection(db, "blocked"), {
      user_id: nickname,
      target_id: targetId,
      target_name: targetNickname,
      createdAt: serverTimestamp(),
    });
  };

  const isBlocked = (id: string) =>
    blocked.some((b) => b.target_id === id);

  const openCtxMenu = (
    e: React.MouseEvent | React.TouchEvent,
    m: Message,
    isMine: boolean
  ) => {
    let x = 0;
    let y = 0;

    if ("touches" in e) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      e.preventDefault();
      x = e.clientX;
      y = e.clientY;
    }

    setCtxMenu({
      msgId: m.id,
      x,
      y,
      isMine,
      msg: m,
    });
  };

  const handleTouchStart = (
    e: React.TouchEvent,
    m: Message,
    isMine: boolean
  ) => {
    longPressTimer.current = setTimeout(() => {
      openCtxMenu(e, m, isMine);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const displayedMessages = msgSearch.trim()
    ? messages.filter((m) =>
        m.content
          .toLowerCase()
          .includes(msgSearch.toLowerCase())
      )
    : messages;

  if (!nickname) {
    return (
      <div className="h-screen flex items-center justify-center">
        로딩중...
      </div>
    );
  }

  const renderMsgContent = (m: Message) => {
    if (m.type === "image") {
      return (
        <img
          src={m.content}
          alt="이미지"
          className="max-w-[220px] max-h-[220px] rounded-2xl object-cover cursor-pointer"
          onClick={() =>
            window.open(m.content, "_blank")
          }
        />
      );
    }

    return (
      <span className="break-words whitespace-pre-wrap">
        {m.content}
      </span>
    );
  };

  const renderChat = () => (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-white to-gray-50">
      {currentChatUser && (
        <div className="px-4 py-3 border-b bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() =>
                  setCurrentChatUser(null)
                }
                className="text-gray-500"
              >
                ←
              </button>
            )}

            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-300 to-orange-300 text-white font-bold flex items-center justify-center shadow">
                {currentChatUser.nickname[0]}
              </div>

              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  onlineUsers.has(
                    currentChatUser.nickname
                  )
                    ? "bg-green-400"
                    : "bg-gray-300"
                }`}
              />
            </div>

            <div>
              <div className="font-bold text-gray-800">
                {currentChatUser.nickname}
              </div>

              <div className="text-xs text-gray-400">
                {onlineUsers.has(
                  currentChatUser.nickname
                )
                  ? "온라인"
                  : "오프라인"}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setShowMsgSearch((p) => !p);
              setMsgSearch("");
            }}
            className="text-xl"
          >
            🔍
          </button>
        </div>
      )}

      {pushBlocked && (
        <div className="m-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-600">
          브라우저 알림이 차단되어 있어요
        </div>
      )}

      {showMsgSearch && (
        <div className="px-4 py-2 border-b bg-white">
          <input
            className="w-full px-4 py-2 rounded-2xl border bg-gray-50 text-sm"
            placeholder="메시지 검색..."
            value={msgSearch}
            onChange={(e) =>
              setMsgSearch(e.target.value)
            }
          />
        </div>
      )}

      {peerTyping && (
        <div className="px-4 py-2 text-xs text-gray-400 italic">
          {currentChatUser?.nickname}님이 입력 중...
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3"
        onClick={() => setCtxMenu(null)}
      >
        {displayedMessages.map((m) => {
          const isMine = m.from === nickname;

          return (
            <div
              key={m.id}
              className={`flex ${
                isMine
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div className="max-w-[80%]">
                {!isMine && (
                  <div className="text-xs text-gray-400 mb-1 ml-1">
                    {m.from}
                  </div>
                )}

                {m.replyTo && (
                  <div className="mb-1 px-3 py-2 rounded-xl bg-blue-50 border-l-4 border-blue-400 text-xs">
                    <div className="font-semibold text-blue-600">
                      {m.replyTo.from}
                    </div>

                    <div className="truncate text-gray-500">
                      {m.replyTo.type === "image"
                        ? "📷 사진"
                        : m.replyTo.content}
                    </div>
                  </div>
                )}

                <div
                  className={`px-4 py-3 rounded-3xl text-sm shadow-sm ${
                    isMine
                      ? "bg-gradient-to-r from-yellow-300 to-orange-300 text-white rounded-br-md"
                      : "bg-white border border-gray-100 rounded-bl-md"
                  }`}
                  onContextMenu={(e) =>
                    openCtxMenu(e, m, isMine)
                  }
                  onTouchStart={(e) =>
                    handleTouchStart(
                      e,
                      m,
                      isMine
                    )
                  }
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                >
                  {renderMsgContent(m)}
                </div>

                {m.reactions &&
                  Object.keys(m.reactions).length >
                    0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {Object.entries(
                        m.reactions
                      ).map(([emoji, users]) => (
                        <button
                          key={emoji}
                          onClick={() =>
                            toggleReaction(
                              m.id,
                              emoji
                            )
                          }
                          className={`text-xs px-2 py-1 rounded-full border ${
                            users.includes(
                              nickname
                            )
                              ? "bg-blue-100 border-blue-300 text-blue-700"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          {emoji} {users.length}
                        </button>
                      ))}
                    </div>
                  )}

                <div
                  className={`mt-1 text-[10px] text-gray-400 flex gap-1 ${
                    isMine
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  {m.edited && (
                    <span>수정됨</span>
                  )}

                  <span>
                    {formatTime(m.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="px-4 py-2 bg-blue-50 border-t flex items-center gap-3">
          <div className="w-1 h-10 rounded-full bg-blue-400" />

          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-blue-600">
              {replyTo.from}
            </div>

            <div className="text-xs text-gray-500 truncate">
              {replyTo.type === "image"
                ? "📷 사진"
                : replyTo.content}
            </div>
          </div>

          <button
            onClick={() => setReplyTo(null)}
            className="text-gray-400"
          >
            ✕
          </button>
        </div>
      )}

      <div className="p-3 bg-white border-t flex items-center gap-2 shrink-0">
        <button
          onClick={() =>
            imageInputRef.current?.click()
          }
          disabled={imgUploading}
          className={`w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg ${
            imgUploading
              ? "animate-pulse"
              : "hover:bg-gray-200"
          }`}
        >
          📷
        </button>

        <input
          type="file"
          ref={imageInputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];

            if (f) sendImage(f);

            e.target.value = "";
          }}
        />

        <input
          className="flex-1 h-11 rounded-full bg-gray-100 px-4 text-sm outline-none"
          placeholder="메시지 입력"
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey
            ) {
              sendMessage();
            }
          }}
        />

        <button
          onClick={sendMessage}
          className="w-11 h-11 rounded-full bg-gradient-to-r from-yellow-300 to-orange-300 text-white shadow hover:scale-105 active:scale-95 transition"
        >
          ➤
        </button>
      </div>

      {ctxMenu && (
        <div
          className="fixed z-50"
          style={{
            top: ctxMenu.y,
            left: ctxMenu.x,
          }}
        >
          <div className="w-44 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex justify-around py-3 border-b">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() =>
                    toggleReaction(
                      ctxMenu.msgId,
                      emoji
                    )
                  }
                  className="text-xl hover:scale-125 transition"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <button
              className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm"
              onClick={() => {
                setReplyTo({
                  id: ctxMenu.msg.id,
                  from: ctxMenu.msg.from,
                  content:
                    ctxMenu.msg.content,
                  type: ctxMenu.msg.type,
                });

                setCtxMenu(null);
              }}
            >
              ↩ 답장
            </button>

            {ctxMenu.isMine && (
              <>
                <button
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm"
                  onClick={() =>
                    editMessage(
                      ctxMenu.msgId
                    )
                  }
                >
                  ✏️ 수정
                </button>

                <button
                  className="w-full px-4 py-3 text-left hover:bg-red-50 text-red-500 text-sm"
                  onClick={() =>
                    deleteMessage(
                      ctxMenu.msgId
                    )
                  }
                >
                  🗑 삭제
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderUserList = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-4 border-b flex items-center justify-between">
        <div>
          <div className="text-xl font-black bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
            WAGIE
          </div>

          <div className="text-xs text-gray-400 mt-0.5">
            실시간 채팅
          </div>
        </div>

        <button
          onClick={toggle}
          className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm transition"
        >
          {isSubscribed ? "🔕" : "🔔"}
        </button>
      </div>

      <div className="px-3 py-3 border-b">
        <input
          className="w-full h-11 rounded-2xl bg-gray-100 px-4 text-sm outline-none"
          placeholder="사용자 검색..."
          onChange={(e) => {}}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
       {users
  .filter((u) => friendIds.has(u.id))
  .map((u) => (
          <SwipeUserItem
            key={u.id}
            u={u}
            isActive={
              currentChatUser?.id === u.id
            }
            isBlocked={isBlocked(u.id)}
            lastMessage={lastMessages[u.id]}
            unreadCount={
              unreadCounts[u.nickname] || 0
            }
            isOnline={onlineUsers.has(
              u.nickname
            )}
            onClick={() =>
              setCurrentChatUser(u)
            }
            onBlock={() =>
              blockUser(
                u.nickname,
                u.id
              )
            }
          />
        ))}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <PageContainer>
        <div className="h-screen flex flex-col overflow-hidden">
          {!currentChatUser
            ? renderUserList()
            : renderChat()}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="h-screen flex overflow-hidden bg-white rounded-none md:rounded-3xl shadow-xl">
        <div className="w-[320px] border-r">
          {renderUserList()}
        </div>

        <div className="flex-1 flex flex-col">
          {currentChatUser ? (
            renderChat()
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50">
              <div className="text-7xl mb-5">
                💬
              </div>

              <div className="text-2xl font-bold text-gray-700">
                대화를 시작해봐요
              </div>

              <div className="text-gray-400 mt-2">
                왼쪽에서 채팅 상대를 선택해주세요
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

const formatTime = (ts: any) => {
  if (!ts) return "";

  const d = ts?.toDate
    ? ts.toDate()
    : new Date(ts);

  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};