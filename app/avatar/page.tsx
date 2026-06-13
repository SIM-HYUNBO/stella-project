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
  type?: "text" | "image" | "audio" | "system";
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

const FORTUNES = [
  { emoji: "🌟", title: "대길!", text: "오늘은 뭘 해도 잘 풀리는 날이에요! 주저하지 말고 도전해보세요." },
  { emoji: "💕", title: "연애운 UP", text: "좋아하는 사람에게 먼저 연락해봐요. 오늘은 인연이 깊어지는 날이에요." },
  { emoji: "💸", title: "금전운 UP", text: "예상치 못한 곳에서 행운이 들어올 수 있어요. 지갑을 열어두세요!" },
  { emoji: "😴", title: "오늘은 쉬어요", text: "무리하지 말고 푹 쉬는 날이에요. 충전이 곧 실력이에요." },
  { emoji: "🤝", title: "인연운 UP", text: "오늘 만나는 사람과 깊은 인연이 생길지도 몰라요. 따뜻하게 대해보세요." },
  { emoji: "⚡", title: "에너지 충만", text: "오늘은 평소보다 두 배 에너지가 넘쳐요! 미뤘던 일을 해치워봐요." },
  { emoji: "🌧️", title: "조심의 날", text: "작은 실수가 큰 결과를 만들 수 있어요. 오늘은 신중하게 행동해요." },
  { emoji: "🎯", title: "집중력 MAX", text: "오늘은 놀라운 집중력을 발휘하는 날이에요. 공부나 업무에 딱 좋아요." },
  { emoji: "🍀", title: "행운의 날", text: "숫자 3이 오늘의 행운 번호예요. 세 번째 선택을 믿어보세요." },
  { emoji: "🥱", title: "평범한 날", text: "특별한 일은 없지만... 평범함도 행복이에요. 소소한 것에 감사해봐요." },
  { emoji: "🔥", title: "불꽃 같은 날", text: "열정이 불타오르는 날이에요! 하고 싶은 걸 마음껏 표현해봐요." },
  { emoji: "🌈", title: "반전 대길", text: "오전에 안 풀려도 오후에 기분 좋은 일이 생길 거예요. 포기하지 마요!" },
];

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
  const LEFT_WIDTH = 72;   // 즐겨찾기 (왼→오 슬라이드)
  const RIGHT_WIDTH = 180; // 알림·숨기기·차단 (오→왼 슬라이드)

  const [offset, setOffset] = useState(0);
  const [side, setSide] = useState<"none" | "left" | "right">("none");

  const startX = useRef(0);
  const isDragging = useRef(false);
  const currentOffset = useRef(0);

  const closePanel = () => { setOffset(0); setSide("none"); currentOffset.current = 0; };

  const onMoveStart = (clientX: number) => {
    startX.current = clientX - offset;
    isDragging.current = true;
  };

  const onMove = (clientX: number) => {
    if (!isDragging.current) return;
    const raw = clientX - startX.current;
    const clamped = Math.min(LEFT_WIDTH, Math.max(-RIGHT_WIDTH, raw));
    setOffset(clamped);
    currentOffset.current = clamped;
  };

  const onMoveEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const o = currentOffset.current;
    if (side === "none") {
      if (o > 30)  { setOffset(LEFT_WIDTH);   setSide("left"); }
      else if (o < -50) { setOffset(-RIGHT_WIDTH); setSide("right"); }
      else { setOffset(0); }
    } else if (side === "left") {
      if (o < 20) { setOffset(0); setSide("none"); }
      else { setOffset(LEFT_WIDTH); }
    } else {
      if (o > -50) { setOffset(0); setSide("none"); }
      else { setOffset(-RIGHT_WIDTH); }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl mb-2">
      {/* 왼쪽 패널 — 즐겨찾기 (왼→오 슬라이드) */}
      <div className="absolute left-0 top-0 h-full flex" style={{ width: LEFT_WIDTH }}>
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(); closePanel(); }}
          className={`w-full flex flex-col items-center justify-center gap-1 text-white text-[10px] font-bold ${isFavorite ? "bg-sky-500" : "bg-amber-400"}`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={isFavorite ? "white" : "none"} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>{isFavorite ? "해제" : "즐겨찾기"}</span>
        </button>
      </div>

      {/* 오른쪽 패널 — 알림·숨기기·차단 (오→왼 슬라이드) */}
      <div className="absolute right-0 top-0 h-full flex" style={{ width: RIGHT_WIDTH }}>
        {/* 알림 */}
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
          <span>{isMuted ? "알림켜기" : "알림끄기"}</span>
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
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-white text-[10px] font-bold ${isBlocked ? "bg-emerald-500" : "bg-red-400"}`}
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
          if (side !== "none") { closePanel(); }
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
  const [hlSel, setHlSel] = useState({ start: 0, end: 0 });
  const [hlColor, setHlColor] = useState("y");
  const [showHlPicker, setShowHlPicker] = useState(false);
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

  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [showSpecialMenu, setShowSpecialMenu] = useState(false);
  const [wordGame, setWordGame] = useState<{ active: boolean; lastWord: string; lastChar: string; lastPlayer: string; startedBy: string } | null>(null);
  const [showFortune, setShowFortune] = useState(false);
  const [fortuneIdx, setFortuneIdx] = useState(0);
  const [fortuneSpinning, setFortuneSpinning] = useState(false);
  const [selectedFortune, setSelectedFortune] = useState<typeof FORTUNES[0] | null>(null);
  const fortuneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { isBlocked: pushBlocked } =
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
    }, () => { setPeerTyping(false); });
  }, [currentChatUser, nickname]);

  // 끝말잇기 게임 상태 구독
  const wordGameKey = nickname && currentChatUser
    ? [nickname, currentChatUser.nickname].sort().join("___")
    : null;

  useEffect(() => {
    if (!wordGameKey) { setWordGame(null); return; }
    const unsub = onSnapshot(doc(db, "wordgame_1v1", wordGameKey), (snap) => {
      if (!snap.exists()) { setWordGame(null); return; }
      setWordGame(snap.data() as any);
    }, () => setWordGame(null));
    return () => unsub();
  }, [wordGameKey]);

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

      try {
        await setDoc(doc(db, "typing", key), {
          from: nicknameRef.current,
          to: currentChatUser.nickname,
          isTyping,
          updatedAt: serverTimestamp(),
        });
      } catch { /* 타이핑 표시 실패는 무시 */ }
    },
    [currentChatUser]
  );

  const startDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("이 브라우저는 받아쓰기를 지원하지 않아요. Chrome을 사용해주세요."); return; }
    if (isDictating) { recognitionRef.current?.stop(); return; }
    let finalText = "";
    const recognition = new SR();
    recognition.lang = "ko-KR";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onstart = () => setIsDictating(true);
    recognition.onend = () => setIsDictating(false);
    recognition.onerror = (e: any) => {
      setIsDictating(false);
      if (e.error === "not-allowed") alert("마이크 권한이 없어요. 브라우저 설정에서 마이크를 허용해주세요.");
      else if (e.error !== "aborted" && e.error !== "no-speech") alert(`받아쓰기 오류: ${e.error}`);
    };
    recognition.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setInput(finalText + interim);
    };
    recognition.start();
    recognitionRef.current = recognition;
    setShowPlusMenu(false);
  };

  const startWordGame = async () => {
    if (!wordGameKey || !nickname || !currentChatUser) return;
    setShowSpecialMenu(false);
    await setDoc(doc(db, "wordgame_1v1", wordGameKey), {
      active: true, lastWord: "", lastChar: "", lastPlayer: "", startedBy: nickname,
    });
    await addDoc(collection(db, "messages"), {
      from: nickname, to: currentChatUser.nickname,
      content: `🎮 ${nickname}님이 끝말잇기를 시작했어요! 먼저 단어를 입력하세요.`,
      type: "system", createdAt: serverTimestamp(),
    });
  };

  const endWordGame = async (reason?: string) => {
    if (!wordGameKey || !nickname || !currentChatUser) return;
    await setDoc(doc(db, "wordgame_1v1", wordGameKey), {
      active: false, lastWord: "", lastChar: "", lastPlayer: "", startedBy: "",
    });
    if (reason) {
      await addDoc(collection(db, "messages"), {
        from: nickname, to: currentChatUser.nickname,
        content: reason, type: "system", createdAt: serverTimestamp(),
      });
    }
  };

  const openFortune = () => {
    setShowSpecialMenu(false);
    setShowFortune(true);
    setFortuneSpinning(true);
    setSelectedFortune(null);
    let idx = 0;
    fortuneIntervalRef.current = setInterval(() => {
      idx = (idx + 1) % FORTUNES.length;
      setFortuneIdx(idx);
    }, 80);
    setTimeout(() => {
      if (fortuneIntervalRef.current) clearInterval(fortuneIntervalRef.current);
      const final = Math.floor(Math.random() * FORTUNES.length);
      setFortuneIdx(final);
      setSelectedFortune(FORTUNES[final]);
      setFortuneSpinning(false);
    }, 1800);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setInput(e.target.value);
    if (e.target.value.trim()) setShowSpecialMenu(false);

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

    const text = input.trim();

    // 끝말잇기 검증
    if (wordGame?.active && wordGameKey) {
      if (wordGame.lastChar && text.charAt(0) !== wordGame.lastChar) {
        setInput("");
        await endWordGame(`❌ '${wordGame.lastChar}'(으)로 시작해야 하는데 '${text}'를 입력했어요. ${nickname}님 탈락! 게임 종료.`);
        return;
      }
      const newLastChar = text.charAt(text.length - 1);
      await setDoc(doc(db, "wordgame_1v1", wordGameKey), {
        active: true, lastWord: text, lastChar: newLastChar,
        lastPlayer: nickname, startedBy: wordGame.startedBy || nickname,
      });
    }

    updateTyping(false);

    const msgData: any = {
      from: nickname,
      to: currentChatUser.nickname,
      content: text,
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
        message: text.length > 60 ? text.slice(0, 60) + "…" : text,
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

  const HL_CLS: Record<string, string> = {
    y: "bg-yellow-300/80", g: "bg-green-300/80",
    p: "bg-pink-300/80",   b: "bg-sky-300/80",
  };

  const renderHighlighted = (text: string) => {
    const parts = text.split(/(==[ygpb]:.*?==|==.*?==)/);
    return parts.map((part, i) => {
      if (!part.startsWith("==") || !part.endsWith("==") || part.length <= 4)
        return <span key={i}>{part}</span>;
      const inner = part.slice(2, -2);
      const m = inner.match(/^([ygpb]):(.+)$/);
      const cls = m ? (HL_CLS[m[1]] ?? HL_CLS.y) : HL_CLS.y;
      const content = m ? m[2] : inner;
      return <mark key={i} className={`${cls} text-slate-800 rounded px-0.5 not-italic`}>{content}</mark>;
    });
  };

  const applyHighlight = (colorKey: string) => {
    const { start, end } = hlSel;
    if (start === end) return;
    const before = input.slice(0, start);
    const selected = input.slice(start, end);
    const after = input.slice(end);
    setInput(`${before}==${colorKey}:${selected}==${after}`);
    setHlSel({ start: 0, end: 0 });
    msgInputRef.current?.focus();
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

  const renderSystemMsg = (m: Message) => (
    <div key={m.id} className="flex justify-center my-1">
      <div className="bg-sky-50 border border-sky-100 text-sky-600 text-xs font-bold px-4 py-2 rounded-full">
        {m.content}
      </div>
    </div>
  );

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

            <div className="relative">
              <button
                onClick={() => setShowHeaderMenu((p) => !p)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-500"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
              </button>
              {showHeaderMenu && (
                <div className="fixed top-[56px] right-3 z-[9999] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-36">
                  <button
                    onClick={async () => {
                      setShowHeaderMenu(false);
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
                    className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition"
                  >
                    나가기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {pushBlocked && (
        <div className="m-3 px-4 py-3 rounded-2xl bg-red-50 text-sm text-red-600">
          브라우저 알림이 차단되어 있어요
        </div>
      )}

      {wordGame?.active && (
        <div className="flex items-center justify-between px-4 py-2 bg-sky-50 border-b border-sky-100 shrink-0">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-700">
              <rect x="2" y="6" width="20" height="14" rx="6"/><line x1="6" y1="13" x2="10" y2="13"/><line x1="8" y1="11" x2="8" y2="15"/><circle cx="16" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="14" r="1" fill="currentColor"/>
            </svg>
            <span className="text-xs font-black text-sky-700">끝말잇기 진행 중</span>
            {wordGame.lastChar && (
              <span className="px-2.5 py-0.5 rounded-full bg-sky-200 text-sky-700 text-xs font-black">
                다음: &apos;{wordGame.lastChar}&apos;
              </span>
            )}
          </div>
          <button onClick={() => endWordGame("🏳️ 끝말잇기가 종료됐어요.")} className="text-[10px] text-slate-400 font-bold px-2">종료</button>
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


      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 py-5 flex flex-col gap-3"
        onClick={() => setCtxMenu(null)}
      >
        {displayedMessages.map((m, i) => {
          if (m.type === "system") return renderSystemMsg(m);

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

        {/* 타이핑 인디케이터 */}
        {peerTyping && (
          <div className="flex items-end gap-2 animate-[fadeIn_0.2s_ease]">
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sm font-bold text-sky-500 shrink-0">
              {currentChatUser?.nickname?.[0] ?? "?"}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400 px-1">{currentChatUser?.nickname}</span>
              <div className="bg-white rounded-[18px] rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" style={{animation:"typingDot 1.2s ease-in-out infinite", animationDelay:"0ms"}} />
                <span className="w-2 h-2 rounded-full bg-sky-400" style={{animation:"typingDot 1.2s ease-in-out infinite", animationDelay:"200ms"}} />
                <span className="w-2 h-2 rounded-full bg-sky-400" style={{animation:"typingDot 1.2s ease-in-out infinite", animationDelay:"400ms"}} />
              </div>
            </div>
          </div>
        )}

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

        {/* + 버튼 (이미지/Aa/마이크 묶음) */}
        <div className="relative shrink-0">
          {showPlusMenu && (
            <div className="absolute bottom-[52px] left-0 flex gap-2 z-50 animate-[fadeInUp_0.15s_ease]">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { imageInputRef.current?.click(); setShowPlusMenu(false); }}
                className="flex flex-col items-center gap-1 w-14 py-2 rounded-[14px] bg-white border border-sky-200 shadow-md text-sky-600 active:scale-95 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <span className="text-[9px] font-bold text-sky-500">이미지</span>
              </button>
              <div className="relative">
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (hlSel.start !== hlSel.end) { applyHighlight(hlColor); setShowPlusMenu(false); }
                    else setShowHlPicker((p) => !p);
                  }}
                  className="flex flex-col items-center gap-1 w-14 py-2 rounded-[14px] bg-white border border-sky-200 shadow-md active:scale-95 transition"
                >
                  <span className="text-[13px] font-black text-sky-500">Aa</span>
                  <span className="text-[9px] font-bold text-sky-500">글자 강조</span>
                </button>
                {showHlPicker && (
                  <div className="absolute bottom-14 left-0 bg-white rounded-2xl shadow-xl p-2 flex gap-2 z-50">
                    {(["y","g","p","b"] as const).map((key) => (
                      <button
                        key={key}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setHlColor(key); setShowHlPicker(false); }}
                        className={`w-8 h-8 rounded-full ${{ y:"bg-yellow-300", g:"bg-green-300", p:"bg-pink-300", b:"bg-sky-300" }[key]} active:scale-90 transition ${key === hlColor ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { toggleRecording(); setShowPlusMenu(false); }}
                className={`flex flex-col items-center gap-1 w-14 py-2 rounded-[14px] border shadow-md active:scale-95 transition ${isRecording ? "bg-red-50 border-red-200 text-red-500 animate-pulse" : "bg-white border-sky-200 text-sky-600"}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
                <span className="text-[9px] font-bold">마이크</span>
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={startDictation}
                className={`flex flex-col items-center gap-1 w-14 py-2 rounded-[14px] border shadow-md active:scale-95 transition ${isDictating ? "bg-green-50 border-green-300 text-green-600 animate-pulse" : "bg-white border-sky-200 text-sky-600"}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
                </svg>
                <span className="text-[9px] font-bold">{isDictating ? "듣는중" : "받아쓰기"}</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setShowPlusMenu((p) => !p)}
            className={`w-10 h-10 rounded-[12px] flex items-center justify-center transition shrink-0 text-xl font-black ${showPlusMenu ? "bg-sky-200 text-white" : "bg-sky-50 text-sky-500"}`}
          >
            {showPlusMenu ? "✕" : "+"}
          </button>
        </div>

        <input
          ref={msgInputRef}
          className="flex-1 min-w-0 w-0 h-11 rounded-[16px] bg-white border border-sky-200 px-4 text-sm outline-none text-slate-800 placeholder:text-slate-400"
          placeholder={wordGame?.active && wordGame.lastChar ? `'${wordGame.lastChar}'(으)로 시작하는 단어` : "메시지 입력"}
          value={input}
          onChange={handleInputChange}
          onSelect={(e) => {
            const el = e.currentTarget;
            setHlSel({ start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 });
          }}
          onBlur={(e) => {
            setHlSel({ start: e.currentTarget.selectionStart ?? 0, end: e.currentTarget.selectionEnd ?? 0 });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { sendMessage(); setShowSpecialMenu(false); }
          }}
        />

        <div className="relative shrink-0">
          {showSpecialMenu && (
            <div className="absolute bottom-[52px] right-0 flex gap-2 z-50 animate-[fadeInUp_0.15s_ease]">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={startWordGame}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[14px] bg-white border border-sky-200 shadow-md text-xs font-black text-sky-600 whitespace-nowrap active:scale-95 transition"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="14" rx="6"/><line x1="6" y1="13" x2="10" y2="13"/><line x1="8" y1="11" x2="8" y2="15"/><circle cx="16" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="14" r="1" fill="currentColor"/>
                </svg> 끝말잇기
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={openFortune}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[14px] bg-white border border-sky-200 shadow-md text-xs font-black text-sky-600 whitespace-nowrap active:scale-95 transition"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg> 오늘의 운세
              </button>
            </div>
          )}
          <button
            onClick={() => {
              if (input.trim()) { sendMessage(); }
              else { setShowSpecialMenu((p) => !p); }
            }}
            className={`w-11 h-11 rounded-[14px] flex items-center justify-center font-black text-base transition shrink-0 ${input.trim() ? "bg-sky-400 text-white hover:scale-105 active:scale-95" : "bg-sky-100 text-sky-500 active:scale-95"}`}
          >
            {input.trim() ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            ) : "#"}
          </button>
        </div>
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
      {showFortune && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { if (!fortuneSpinning) setShowFortune(false); }}>
          <div className="mx-6 w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-sky-400 to-cyan-400 px-6 py-6 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <p className="text-white/80 text-xs font-black tracking-widest">오늘의 운세</p>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <div className={`text-7xl mb-2 ${fortuneSpinning ? "animate-[fortuneSpin_0.08s_linear_infinite]" : "animate-[fortuneReveal_0.4s_ease]"}`}>
                {FORTUNES[fortuneIdx].emoji}
              </div>
              <p className={`text-white font-black text-2xl ${fortuneSpinning ? "opacity-30" : "opacity-100 transition-opacity duration-300"}`}>
                {fortuneSpinning ? "룰렛 돌리는 중..." : FORTUNES[fortuneIdx].title}
              </p>
            </div>
            <div className="px-6 py-5">
              {fortuneSpinning ? (
                <div className="flex justify-center py-4">
                  <div className="flex gap-1.5">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-2.5 h-2.5 rounded-full bg-sky-300" style={{animation:`typingDot 1.2s ease-in-out infinite`, animationDelay:`${i*200}ms`}} />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-slate-700 text-sm leading-relaxed text-center">{selectedFortune?.text}</p>
                  <button onClick={() => setShowFortune(false)} className="mt-5 w-full h-12 rounded-[16px] bg-sky-100 text-sky-600 font-black text-sm active:scale-95 transition">
                    확인 ✨
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col">{renderUserList()}</div>
      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fortuneSpin {
          0%   { transform: scale(1) rotate(0deg); }
          50%  { transform: scale(1.1) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes fortuneReveal {
          from { transform: scale(0.5) rotate(-15deg); opacity: 0; }
          to   { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
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