"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  type?: "text" | "image" | "audio";
  createdAt?: any;
  readBy?: string[];
  replyTo?: ReplyTo;
  reactions?: Record<string, string[]>;
  edited?: boolean;
};

type User = {
  id: string;
  nickname: string;
  profileImage?: string | null;
  title?: string | null;
};

const TITLE_MAP: Record<string, { icon: string; name: string }> = {
  newcomer:    { icon: "🌱", name: "새싹" },
  talker:      { icon: "💬", name: "수다쟁이" },
  chatterer:   { icon: "🗣️", name: "채팅왕" },
  talkmaster:  { icon: "👑", name: "말왕" },
  talkgod:     { icon: "⚡", name: "말신" },
  friendly:    { icon: "🤝", name: "친화력 갑" },
  richfriend:  { icon: "💎", name: "친구부자" },
  popular:     { icon: "😎", name: "인싸" },
  partyperson: { icon: "🎉", name: "파티피플" },
  groupmaster: { icon: "🎪", name: "방장" },
  nightowl:    { icon: "🦉", name: "야행성" },
  legend:      { icon: "🌟", name: "레전드" },
};

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

function SwipeUserItem({
  u,
  isActive,
  isBlocked,
  isHidden,
  isMuted,
  isFavorite,
  lastMessage,
  unreadCount,
  isOnline,
  onClick,
  onBlock,
  onHide,
  onMute,
  onFavorite,
}: any) {
  const BUTTON_WIDTH = 240;

  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);

  const startX = useRef(0);
  const isDragging = useRef(false);
  const currentOffset = useRef(0);

  const closePanel = () => { setOffset(0); setOpen(false); currentOffset.current = 0; };

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
      if (currentOffset.current < -40) { setOffset(-BUTTON_WIDTH); setOpen(true); }
      else { setOffset(0); }
    } else {
      if (currentOffset.current > -40) { setOffset(0); setOpen(false); }
      else { setOffset(-BUTTON_WIDTH); }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl mb-2">
      <div className="absolute right-0 top-0 h-full flex" style={{ width: BUTTON_WIDTH }}>
        {/* 즐겨찾기 */}
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(); closePanel(); }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-white text-[10px] font-bold ${isFavorite ? "bg-sky-600" : "bg-amber-1000"}`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={isFavorite ? "white" : "none"} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>{isFavorite ? "해제" : "즐겨찾기"}</span>
        </button>
        {/* 알림 끄기 */}
        <button
          onClick={(e) => { e.stopPropagation(); onMute(); closePanel(); }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-white text-[10px] font-bold ${isMuted ? "bg-sky-500" : "bg-gray-400"}`}
        >
          {isMuted ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
              <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
              <path d="M18 8a6 6 0 0 0-9.33-4.99" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
          <span>{isMuted ? "알림 켜기" : "알림 끄기"}</span>
        </button>
        {/* 숨기기 */}
        <button
          onClick={(e) => { e.stopPropagation(); onHide(); closePanel(); }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-white text-[10px] font-bold ${isHidden ? "bg-sky-300" : "bg-slate-400"}`}
        >
          {isHidden ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
          <span>{isHidden ? "보이기" : "숨기기"}</span>
        </button>
        {/* 차단 */}
        <button
          onClick={(e) => { e.stopPropagation(); onBlock(); closePanel(); }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-white text-[10px] font-bold ${isBlocked ? "bg-emerald-500" : "bg-yellow-200"}`}
        >
          {isBlocked ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <polyline points="17 11 19 13 23 9" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="18" y1="8" x2="23" y2="13" />
              <line x1="23" y1="8" x2="18" y2="13" />
            </svg>
          )}
          <span>{isBlocked ? "차단해제" : "차단"}</span>
        </button>
      </div>

      <div
        className={`relative z-10 px-3 py-3 bg-white cursor-pointer transition ${
          isActive ? "bg-yellow-200" : "hover:bg-gray-50"
        }`}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging.current ? "none" : "transform .25s ease",
        }}
        onMouseDown={(e) => onMoveStart(e.clientX)}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseUp={onMoveEnd}
        onMouseLeave={onMoveEnd}
        onTouchStart={(e) => onMoveStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onMoveEnd}
        onClick={() => {
          if (open) { closePanel(); }
          else if (offset === 0) { onClick(); }
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {u.profileImage ? (
              <img
                src={u.profileImage}
                alt={u.nickname}
                className="w-11 h-11 rounded-full object-cover shadow"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-yellow-200 flex items-center justify-center text-sm font-bold text-white shadow">
                {u.nickname[0]}
              </div>
            )}
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
  const searchParams = useSearchParams();

  const [nickname, setNickname] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);

  const [users, setUsers] = useState<User[]>([]);
  const [currentChatUser, setCurrentChatUser] =
    useState<User | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [pendingAudio, setPendingAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [sendingAudio, setSendingAudio] = useState(false);

  const [blocked, setBlocked] = useState<any[]>([]);
  const [hiddenDocs, setHiddenDocs] = useState<Record<string, string>>({});
  const [mutedDocs, setMutedDocs] = useState<Record<string, string>>({});
  const [favoriteDocs, setFavoriteDocs] = useState<Record<string, string>>({});

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
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [sendingImage, setSendingImage] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  const [ctxMenu, setCtxMenu] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const msgInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

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
      setAuthReady(true);
      if (user) {
        setNickname(user.displayName || "유저");
        setUid(user.uid);
      } else {
        router.replace("/login");
      }
    });
    return () => unsub();
  }, []);

  /* 친구 요청 수신 리스너 */
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "friend_requests"),
      where("to", "==", uid),
      where("status", "==", "pending")
    );
    return onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setFriendRequests(list);
    });
  }, [uid]);

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
          profileImage: data.profileImage ?? null,
          title: data.title ?? null,
        });
      });

      const filtered = list.filter((u) => u.nickname !== nickname);
      filtered.sort((a, b) => (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko"));
      setUsers(filtered);

      const openNickname = searchParams.get("open");
      if (openNickname) {
        const target = filtered.find((u) => u.nickname === openNickname);
        if (target) setCurrentChatUser(target);
      }
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
    if (!uid) return;
    const q = query(collection(db, "hidden"), where("user_id", "==", uid));
    return onSnapshot(q, (snap) => {
      const docs: Record<string, string> = {};
      snap.forEach((d) => { const tuid = d.data().target_uid; if (tuid) docs[tuid] = d.id; });
      setHiddenDocs(docs);
    });
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "muted"), where("user_id", "==", uid));
    return onSnapshot(q, (snap) => {
      const docs: Record<string, string> = {};
      snap.forEach((d) => { const tuid = d.data().target_uid; if (tuid) docs[tuid] = d.id; });
      setMutedDocs(docs);
    });
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "favorites"), where("user_id", "==", uid));
    return onSnapshot(q, (snap) => {
      const docs: Record<string, string> = {};
      snap.forEach((d) => { const tuid = d.data().target_uid; if (tuid) docs[tuid] = d.id; });
      setFavoriteDocs(docs);
    });
  }, [uid]);

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

  /* 친구 목록 — friends 컬렉션은 { users: [uid1, uid2] } 구조 */
  useEffect(() => {
    if (!uid) return;

    const q = query(collection(db, "friends"), where("users", "array-contains", uid));
    const unsub = onSnapshot(q, async (snap) => {
      const nickSet = new Set<string>();
      for (const d of snap.docs) {
        const data = d.data();
        const friendUid = (data.users as string[]).find((u) => u !== uid);
        if (!friendUid) continue;
        // users 컬렉션에서 닉네임 찾기
        const found = users.find((u) => u.id === friendUid);
        if (found) {
          nickSet.add(found.nickname);
        } else {
          const uSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", friendUid)));
          uSnap.forEach((ud) => nickSet.add(ud.data().nickname));
        }
      }
      setFriendIds(nickSet);
    });

    return () => unsub();
  }, [uid, users]);

  // 1:1 채팅 읽지 않은 메시지 수
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
          m.type === "image" ? "📷 사진" :
          m.content;

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

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setPendingAudio({ blob, url: URL.createObjectURL(blob) });
        setIsRecording(false);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      recordTimerRef.current = setTimeout(() => mr.stop(), 30000);
    } catch {
      alert("마이크 권한이 필요해요.");
    }
  };

  const cancelAudio = () => {
    if (pendingAudio) URL.revokeObjectURL(pendingAudio.url);
    setPendingAudio(null);
  };

  const sendAudio = async () => {
    if (!pendingAudio || sendingAudio || !nickname || !currentChatUser) return;
    setSendingAudio(true);
    try {
      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(pendingAudio.blob);
        reader.onloadend = async () => {
          try {
            await addDoc(collection(db, "messages"), {
              from: nickname,
              to: currentChatUser.nickname,
              content: reader.result as string,
              type: "audio",
              createdAt: serverTimestamp(),
              readBy: [nickname],
            });
            URL.revokeObjectURL(pendingAudio.url);
            setPendingAudio(null);
            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = reject;
      });
    } catch {
      alert("전송 실패. 다시 시도해주세요.");
    } finally {
      setSendingAudio(false);
    }
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

    fetch("/api/fcm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toNicknames: [currentChatUser.nickname],
        fromNickname: nickname,
        message: input.trim().length > 60 ? input.trim().slice(0, 60) + "…" : input.trim(),
        url: `/avatar?open=${encodeURIComponent(nickname ?? "")}`,
      }),
    }).catch(() => {});

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
    const base64 = await compressToBase64(file);
    await addDoc(collection(db, "messages"), {
      from: nickname,
      to: currentChatUser.nickname,
      content: base64,
      type: "image",
      createdAt: serverTimestamp(),
      readBy: [nickname],
    });
    fetch("/api/fcm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toNicknames: [currentChatUser.nickname],
        fromNickname: nickname,
        message: "📷 사진을 보냈어요",
        url: `/avatar?open=${encodeURIComponent(nickname ?? "")}`,
      }),
    }).catch(() => {});
  };

  const cancelPendingImage = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage(null);
  };

  const sendPendingImage = async () => {
    if (!pendingImage || sendingImage) return;
    setSendingImage(true);
    try {
      await sendImage(pendingImage.file);
      URL.revokeObjectURL(pendingImage.previewUrl);
      setPendingImage(null);
    } catch {
      alert("전송 실패. 다시 시도해주세요.");
    } finally {
      setSendingImage(false);
    }
  };

  const acceptFriendRequest = async (req: any) => {
    if (!uid) return;
    const chatId = [uid, req.from].sort().join("_");
    await setDoc(doc(db, "friends", chatId), {
      users: [uid, req.from],
      createdAt: Date.now(),
    });
    await deleteDoc(doc(db, "friend_requests", req.id));
  };

  const rejectFriendRequest = async (req: any) => {
    await deleteDoc(doc(db, "friend_requests", req.id));
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

  const toggleHide = async (targetUid: string, targetNickname: string) => {
    if (!uid) return;
    if (hiddenDocs[targetUid]) {
      await deleteDoc(doc(db, "hidden", hiddenDocs[targetUid]));
    } else {
      await addDoc(collection(db, "hidden"), { user_id: uid, target_uid: targetUid, target_name: targetNickname });
    }
  };

  const toggleMute = async (targetUid: string, targetNickname: string) => {
    if (!uid) return;
    if (mutedDocs[targetUid]) {
      await deleteDoc(doc(db, "muted", mutedDocs[targetUid]));
    } else {
      await addDoc(collection(db, "muted"), { user_id: uid, target_uid: targetUid, target_name: targetNickname });
    }
  };

  const toggleFavorite = async (targetUid: string, targetNickname: string) => {
    if (!uid) return;
    if (favoriteDocs[targetUid]) {
      await deleteDoc(doc(db, "favorites", favoriteDocs[targetUid]));
    } else {
      await addDoc(collection(db, "favorites"), { user_id: uid, target_uid: targetUid, target_name: targetNickname });
    }
  };

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

  const renderHighlighted = (text: string) => {
    const parts = text.split(/(==.+?==)/);
    return parts.map((part, i) =>
      part.startsWith("==") && part.endsWith("==") && part.length > 4
        ? <mark key={i} className="bg-yellow-300/80 text-slate-800 rounded px-0.5 not-italic">{part.slice(2, -2)}</mark>
        : <span key={i}>{part}</span>
    );
  };

  const applyHighlight = () => {
    const el = msgInputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return;
    const before = input.slice(0, start);
    const selected = input.slice(start, end);
    const after = input.slice(end);
    setInput(`${before}==${selected}==${after}`);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + 2, end + 2); }, 0);
  };

  const renderMsgContent = (m: Message) => {
    if (m.type === "image") {
      return (
        <img
          src={m.content}
          alt="이미지"
          className="max-w-[220px] max-h-[220px] rounded-2xl object-cover cursor-pointer"
          onClick={() => window.open(m.content, "_blank")}
        />
      );
    }
    if (m.type === "audio") {
      return <audio src={m.content} controls className="max-w-[220px] rounded-xl" />;
    }
    return (
      <span className="break-words whitespace-pre-wrap">
        {renderHighlighted(m.content)}
      </span>
    );
  };

  const renderChat = () => (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {currentChatUser && (
        <div className="px-4 py-3 bg-white backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentChatUser(null)}
              className="text-gray-500 text-lg px-1"
            >
              ←
            </button>

            <div className="relative">
              {currentChatUser.profileImage ? (
                <img
                  src={currentChatUser.profileImage}
                  alt={currentChatUser.nickname}
                  className="w-11 h-11 rounded-full object-cover shadow"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg- text-white font-bold flex items-center justify-center shadow">
                  {currentChatUser.nickname[0]}
                </div>
              )}

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

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowMsgSearch((p) => !p);
                setMsgSearch("");
              }}
              className="text-xl"
            >
              🔍
            </button>

            <button
              onClick={async () => {
                if (!nickname || !currentChatUser) return;
                if (!confirm(`${currentChatUser.nickname}님과의 대화를 모두 삭제하고 나가시겠습니까?`)) return;
                const { getDocs: _getDocs, query: _query, collection: _col, where: _where, deleteDoc: _del, doc: _doc } = await import("firebase/firestore");
                const snap = await _getDocs(_query(_col(db, "messages"),
                  _where("from", "in", [nickname, currentChatUser.nickname]),
                ));
                await Promise.all(
                  snap.docs
                    .filter(d => {
                      const data = d.data();
                      return (
                        (data.from === nickname && data.to === currentChatUser.nickname) ||
                        (data.from === currentChatUser.nickname && data.to === nickname)
                      );
                    })
                    .map(d => _del(_doc(db, "messages", d.id)))
                );
                setCurrentChatUser(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-sm font-medium transition"
            >
              나가기
            </button>
          </div>
        </div>
      )}

      {pushBlocked && (
        <div className="m-3 px-4 py-3 rounded-2xl bg-red-50 text-sm text-red-600">
          브라우저 알림이 차단되어 있어요
        </div>
      )}

      {showMsgSearch && (
        <div className="px-4 py-2 border-b bg-white">
          <input
            className="w-full px-4 py-2 rounded-2xl bg-white border border-gray-200 text-sm"
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
        className="flex-1 min-h-0 overflow-y-auto px-4 py-5 flex flex-col gap-3"
        onClick={() => setCtxMenu(null)}
      >
        {displayedMessages.map((m, i) => {
          const isMine = m.from === nickname;
          const currentDate = formatDateLabel(m.createdAt);
          const prevDate = i > 0 ? formatDateLabel(displayedMessages[i - 1].createdAt) : null;
          const showDate = currentDate && currentDate !== prevDate;

          return (
            <div key={m.id}>
              {showDate && (
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 shrink-0">{currentDate}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}
            <div
              key={m.id}
              className={`flex items-end gap-2 ${
                isMine
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              {!isMine && (
                <div className="shrink-0 self-end mb-1">
                  {currentChatUser?.profileImage ? (
                    <img
                      src={currentChatUser.profileImage}
                      alt={currentChatUser.nickname}
                      className="w-8 h-8 rounded-full object-cover shadow"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center text-xs font-bold text-white shadow">
                      {m.from[0]}
                    </div>
                  )}
                </div>
              )}
              <div className="max-w-[75%]">
                {!isMine && (
                  <div className="flex items-center gap-1.5 mb-1 ml-1">
                    <span className="text-xs text-gray-400">{m.from}</span>
                  </div>
                )}

                {m.replyTo && (
                  <div className="mb-1 px-3 py-2 rounded-xl bg-sky-50 text-xs">
                    <div className="font-semibold text-sky-700">
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
                  className={`px-4 py-3 rounded-3xl text-sm ${
                    isMine
                      ? "bg-sky-200 text-white rounded-br-md"
                      : "bg-white rounded-bl-md"
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
                              ? "bg-sky-200 border-blue-300 text-blue-700"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          {emoji} {users.length}
                        </button>
                      ))}
                    </div>
                  )}

                <div
                  className={`mt-1 text-[10px] text-gray-400 flex items-center gap-1 ${
                    isMine ? "justify-end" : "justify-start"
                  }`}
                >
                  {(() => {
                    const readByArr = m.readBy || [];
                    const unread = 2 - readByArr.length;
                    return unread > 0 ? (
                      <span className="text-sky-600 font-bold">{unread}</span>
                    ) : null;
                  })()}
                  {m.edited && <span>수정됨</span>}
                  <span>{formatTime(m.createdAt)}</span>
                </div>
              </div>
            </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="px-4 py-2 bg-sky-50 border-t flex items-center gap-3">
          <div className="w-1 h-10 rounded-full bg-blue-400" />

          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-sky-700">
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

      {pendingImage && (
        <div className="px-3 py-2 bg-white flex items-center gap-3 shrink-0">
          <img src={pendingImage.previewUrl} alt="미리보기" className="w-14 h-14 rounded-xl object-cover shrink-0" />
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button onClick={cancelPendingImage} disabled={sendingImage} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 text-xs font-bold hover:bg-gray-50 disabled:opacity-40">✕</button>
            <button
              onClick={sendPendingImage}
              disabled={sendingImage}
              className="w-10 h-10 rounded-[12px] bg-sky-200 text-white flex items-center justify-center disabled:opacity-50"
            >
              {sendingImage
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : "➤"}
            </button>
          </div>
        </div>
      )}

      {pendingAudio && (
        <div className="px-3 py-2 bg-white flex items-center gap-2 shrink-0">
          <span className="text-lg shrink-0">🎵</span>
          <span className="text-xs font-black text-sky-600 shrink-0">대기중</span>
          <audio src={pendingAudio.url} controls className="flex-1 h-8 min-w-0" />
          <button onClick={cancelAudio} disabled={sendingAudio} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 text-xs font-bold shrink-0 disabled:opacity-40">✕</button>
          <button onClick={sendAudio} disabled={sendingAudio} className="w-10 h-10 rounded-[12px] bg-sky-200 text-white flex items-center justify-center shrink-0 disabled:opacity-50">
            {sendingAudio ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "➤"}
          </button>
        </div>
      )}

      <div className="px-3 py-2 bg-white flex items-center gap-2 shrink-0">
        <button
          onClick={() => imageInputRef.current?.click()}
          className="w-10 h-10 rounded-[12px] bg-sky-50 hover:bg-sky-200 text-sky-600 flex items-center justify-center transition shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <input
          type="file"
          ref={imageInputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              const url = URL.createObjectURL(f);
              setPendingImage({ file: f, previewUrl: url });
            }
            e.target.value = "";
          }}
        />
        <button
          onClick={applyHighlight}
          title="형광 표시 (텍스트 선택 후 클릭)"
          className="w-10 h-10 rounded-[12px] bg-yellow-200 hover:bg-yellow-300 active:scale-95 flex items-center justify-center transition shrink-0 text-[11px] font-black text-yellow-800"
        >
          형광
        </button>
        <input
          ref={msgInputRef}
          className="flex-1 min-w-0 w-0 h-11 rounded-[16px] bg-white border border-sky-200 px-4 text-sm outline-none text-slate-800 placeholder:text-slate-400"
          placeholder="메시지 입력"
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) sendMessage();
          }}
        />

        <button
          onClick={toggleRecording}
          className={`w-10 h-10 rounded-[12px] flex items-center justify-center transition shrink-0 ${isRecording ? "bg-red-100 text-red-500 animate-pulse" : "bg-sky-50 hover:bg-sky-200 text-sky-600"}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>

        <button
          onClick={sendMessage}
          className="w-11 h-11 rounded-[14px] bg-sky-200 text-white hover:scale-105 active:scale-95 transition shrink-0"
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
          <div className="w-44 bg-white rounded-3xl overflow-hidden">
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
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-4 py-4 flex items-center justify-between">
        <div>
          <div className="text-xl font-black bg-yellow-200">
            WAGIE
          </div>

          <div className="text-xs text-gray-400 mt-0.5">
            실시간 채팅
          </div>
        </div>

       <button
  onClick={() => {
    console.log("nickname:", nickname);
    toggle();
  }}
  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm transition"
>
  {isSubscribed ? "🔕" : "🔔"}
</button>
      </div>

      <div className="px-3 py-3">
        <input
          className="w-full h-11 rounded-[16px] bg-white border border-sky-200 px-4 text-sm outline-none text-slate-800 placeholder:text-slate-400"
          placeholder="사용자 검색..."
          onChange={(e) => {}}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
       {users
  .filter((u) => friendIds.has(u.nickname))
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
            isOnline={onlineUsers.has(u.nickname)}
            isHidden={!!hiddenDocs[u.id]}
            isMuted={!!mutedDocs[u.id]}
            isFavorite={!!favoriteDocs[u.id]}
            onClick={() => setCurrentChatUser(u)}
            onBlock={() => blockUser(u.nickname, u.id)}
            onHide={() => toggleHide(u.id, u.nickname)}
            onMute={() => toggleMute(u.id, u.nickname)}
            onFavorite={() => toggleFavorite(u.id, u.nickname)}
          />
        ))}
      </div>
    </div>
  );

  if (!authReady) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const pendingRequest = friendRequests[0] ?? null;

  // 채팅 중: 모바일·데스크탑 모두 fixed inset-0 (PageContainer p-4 오버플로우 문제 방지)
  if (currentChatUser) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-gray-50">
        {pendingRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl p-6 w-72 flex flex-col gap-4">
              <div className="text-center">
                <div className="text-2xl mb-2">👋</div>
                <div className="font-bold text-gray-800 text-base">
                  {pendingRequest.fromNickname || pendingRequest.from}님이 친구를 요청했어요
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => acceptFriendRequest(pendingRequest)} className="flex-1 bg-sky-600 text-white py-2.5 rounded-xl font-semibold">수락</button>
                <button onClick={() => rejectFriendRequest(pendingRequest)} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-semibold">거절</button>
              </div>
            </div>
          </div>
        )}
        {renderChat()}
      </div>
    );
  }

  return (
    <PageContainer>
      {pendingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-72 flex flex-col gap-4">
            <div className="text-center">
              <div className="text-2xl mb-2">👋</div>
              <div className="font-bold text-gray-800 text-base">
                {pendingRequest.fromNickname || pendingRequest.from}님이 친구를 요청했어요
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => acceptFriendRequest(pendingRequest)} className="flex-1 bg-sky-600 text-white py-2.5 rounded-xl font-semibold">수락</button>
              <button onClick={() => rejectFriendRequest(pendingRequest)} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-semibold">거절</button>
            </div>
            {friendRequests.length > 1 && (
              <div className="text-center text-xs text-gray-400">외 {friendRequests.length - 1}건 더 있어요</div>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-col">{renderUserList()}</div>
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
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
};