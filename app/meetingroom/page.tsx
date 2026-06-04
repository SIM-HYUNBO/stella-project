"use client";

import { useEffect, useState, useRef } from "react";
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
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  where,
  getDocs,
} from "firebase/firestore";

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

type MeetingRoom = {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  topic?: string;
  topicSetBy?: string;
  createdAt?: any;
  profileImage?: string;
};

type MeetingMessage = {
  id: string;
  from: string;
  content: string;
  type?: "text" | "image" | "urgent";
  createdAt?: any;
  readBy?: string[];
};

type User = {
  id: string;
  nickname: string;
};

export default function MeetingRoomPage() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [memberTitles, setMemberTitles] = useState<Record<string, string>>({});
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<MeetingRoom | null>(null);
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [inviting, setInviting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [showTopicEdit, setShowTopicEdit] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

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

  // 방 목록
  useEffect(() => {
    if (!nickname) return;
    const q = query(
      collection(db, "meeting_rooms"),
      where("members", "array-contains", nickname)
    );
    return onSnapshot(q, (snap) => {
      const list: MeetingRoom[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MeetingRoom, "id">),
      }));
      list.sort((a, b) => {
        const ta = a.createdAt?.toDate?.()?.getTime() ?? 0;
        const tb = b.createdAt?.toDate?.()?.getTime() ?? 0;
        return tb - ta;
      });
      setRooms(list);

      const roomParam = searchParams.get("room") || searchParams.get("from");
      if (roomParam) {
        const target = list.find((r) => r.id === roomParam);
        if (target) setCurrentRoom(target);
      }
    });
  }, [nickname]);

  // 읽지 않은 메시지 수
  useEffect(() => {
    if (!nickname || rooms.length === 0) return;
    const unsubs = rooms.map((room) => {
      const q = query(collection(db, "meeting_rooms", room.id, "messages"));
      return onSnapshot(q, (snap) => {
        const count = snap.docs.filter((d) => {
          const data = d.data();
          return data.from !== nickname && !(data.readBy || []).includes(nickname);
        }).length;
        setUnreadCounts((prev) => ({ ...prev, [room.id]: count }));
      });
    });
    return () => unsubs.forEach((u) => u());
  }, [rooms.map((r) => r.id).join(","), nickname]);

  // currentRoom 동기화
  useEffect(() => {
    if (!currentRoom) return;
    const updated = rooms.find((r) => r.id === currentRoom.id);
    if (updated) {
      setCurrentRoom(updated);
    } else {
      setCurrentRoom(null);
    }
  }, [rooms]);

  // 메시지
  useEffect(() => {
    if (!currentRoom || !nickname) return;
    const q = query(
      collection(db, "meeting_rooms", currentRoom.id, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, async (snap) => {
      const msgs: MeetingMessage[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        const m: MeetingMessage = {
          id: d.id,
          from: data.from,
          content: data.content,
          type: data.type || "text",
          createdAt: data.createdAt,
          readBy: data.readBy || [],
        };
        if (m.from !== nickname && !m.readBy?.includes(nickname)) {
          await updateDoc(
            doc(db, "meeting_rooms", currentRoom.id, "messages", m.id),
            { readBy: arrayUnion(nickname) }
          );
        }
        msgs.push(m);
      }
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });
    return () => unsub();
  }, [currentRoom?.id, nickname]);

  // 멤버 칭호 로드
  useEffect(() => {
    if (!currentRoom) return;
    const fetchTitles = async () => {
      const snap = await getDocs(query(collection(db, "users"), where("nickname", "in", currentRoom.members)));
      const map: Record<string, string> = {};
      snap.forEach((d) => { if (d.data().title) map[d.data().nickname] = d.data().title; });
      setMemberTitles(map);
    };
    fetchTitles();
  }, [currentRoom?.id]);

  // 사용자 목록
  useEffect(() => {
    if (!nickname) return;
    return onSnapshot(collection(db, "users"), (snap) => {
      const list: User[] = snap.docs
        .map((d) => ({ id: d.id, nickname: d.data().nickname as string }))
        .filter((u) => u.nickname !== nickname);
      setAllUsers(list);
    });
  }, [nickname]);

  const createRoom = async () => {
    if (!newRoomName.trim() || !nickname) return;
    await addDoc(collection(db, "meeting_rooms"), {
      name: newRoomName.trim(),
      members: [nickname],
      createdBy: nickname,
      topic: "",
      createdAt: serverTimestamp(),
    });
    setNewRoomName("");
    setShowCreate(false);
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert("이 브라우저는 음성 인식을 지원하지 않아요.");
    const recognition = new SR();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput((prev) => prev + text);
    };
    recognition.start();
  };

  const sendMessage = async () => {
    if (!input.trim() || !nickname || !currentRoom) return;
    const text = input.trim();
    await addDoc(collection(db, "meeting_rooms", currentRoom.id, "messages"), {
      from: nickname,
      content: text,
      type: "text",
      createdAt: serverTimestamp(),
      readBy: [nickname],
    });
    setInput("");
  };

  const sendUrgent = async () => {
    if (!currentRoom || !nickname) return;
    const content = `🚨 [긴급회의] ${nickname}님이 긴급회의를 소집했습니다! 즉시 참여해주세요.`;
    await addDoc(collection(db, "meeting_rooms", currentRoom.id, "messages"), {
      from: nickname,
      content,
      type: "urgent",
      createdAt: serverTimestamp(),
      readBy: [nickname],
    });
    const targets = currentRoom.members.filter((m) => m !== nickname);
    if (targets.length > 0) {
      fetch("/api/fcm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toNicknames: targets,
          fromNickname: nickname,
          message: content,
          roomName: currentRoom.name,
          url: `/meetingroom?room=${currentRoom.id}`,
        }),
      }).catch(() => {});
    }
  };

  const saveTopic = async () => {
    if (!currentRoom || !nickname) return;
    await updateDoc(doc(db, "meeting_rooms", currentRoom.id), {
      topic: topicInput.trim(),
      topicSetBy: nickname,
    });
    await addDoc(collection(db, "meeting_rooms", currentRoom.id, "messages"), {
      from: "시스템",
      content: `📌 ${nickname}님이 주제를 설정했습니다: "${topicInput.trim()}"`,
      type: "text",
      createdAt: serverTimestamp(),
      readBy: [],
    });
    setShowTopicEdit(false);
    setTopicInput("");
  };

  const compressToBase64 = (file: File, maxPx = 800): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("이미지 로드 실패")); };
      img.src = url;
    });

  const sendImage = async (file: File) => {
    if (!nickname || !currentRoom) return;
    setImgUploading(true);
    try {
      const base64 = await compressToBase64(file);
      await addDoc(collection(db, "meeting_rooms", currentRoom.id, "messages"), {
        from: nickname,
        content: base64,
        type: "image",
        createdAt: serverTimestamp(),
        readBy: [nickname],
      });
    } finally {
      setImgUploading(false);
    }
  };

  const inviteUser = async (targetNickname: string) => {
    if (!currentRoom || inviting) return;
    setInviting(true);
    try {
      await updateDoc(doc(db, "meeting_rooms", currentRoom.id), {
        members: arrayUnion(targetNickname),
      });
      setShowInvite(false);
    } finally {
      setInviting(false);
    }
  };

  const leaveRoom = async () => {
    if (!currentRoom || !nickname) return;
    if (!confirm(`"${currentRoom.name}" 방에서 나가시겠습니까?`)) return;
    await updateDoc(doc(db, "meeting_rooms", currentRoom.id), {
      members: arrayRemove(nickname),
    });
    setCurrentRoom(null);
  };

  const changeProfileImage = async (file: File) => {
    if (!currentRoom) return;
    setProfileUploading(true);
    try {
      const base64 = await compressToBase64(file);
      await updateDoc(doc(db, "meeting_rooms", currentRoom.id), {
        profileImage: base64,
      });
    } finally {
      setProfileUploading(false);
    }
  };

  if (!nickname) {
    return <div className="h-screen flex items-center justify-center">로딩중...</div>;
  }

  // 초대 모달
  const renderInviteModal = () => {
    if (!showInvite || !currentRoom) return null;
    const notInRoom = allUsers.filter((u) => !currentRoom.members.includes(u.nickname));
    return (
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        onClick={() => setShowInvite(false)}
      >
        <div className="w-80 bg-white rounded-3xl shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
          <div className="text-lg font-bold text-gray-800 mb-4">사용자 초대</div>
          <div className="max-h-[350px] overflow-y-auto flex flex-col gap-2">
            {notInRoom.map((u) => (
              <button
                key={u.id}
                disabled={inviting}
                onClick={() => inviteUser(u.nickname)}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-gray-50 transition text-left"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-300 to-orange-300 text-white font-bold flex items-center justify-center shadow">
                  {u.nickname[0]}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{u.nickname}</div>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowInvite(false)}
            className="mt-4 w-full h-11 rounded-2xl bg-gray-100 hover:bg-gray-200 text-sm"
          >
            닫기
          </button>
        </div>
      </div>
    );
  };

  // 채팅
  const renderRoom = () => (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button onClick={() => setCurrentRoom(null)} className="text-gray-500">←</button>
          )}

          <div className="relative shrink-0 group">
            {currentRoom?.profileImage ? (
              <img src={currentRoom.profileImage} alt="프로필" className="w-11 h-11 rounded-full object-cover shadow" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-300 to-orange-300 text-white font-bold flex items-center justify-center shadow">
                {currentRoom?.name[0]}
              </div>
            )}
            <button
              disabled={profileUploading}
              onClick={() => profileInputRef.current?.click()}
              className={`absolute inset-0 rounded-full bg-black/40 flex items-center justify-center transition ${profileUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            >
              ✏️
            </button>
            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) changeProfileImage(f);
                e.target.value = "";
              }}
            />
          </div>

          <div>
            <div className="font-bold text-gray-800">{currentRoom?.name}</div>
            <div className="text-xs text-gray-400">멤버 {currentRoom?.members.length}명</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={sendUrgent}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs shadow-md active:scale-95 transition animate-[pulse_3s_infinite]"
          >
            🚨 긴급
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm transition"
          >
            초대
          </button>
          <button
            onClick={leaveRoom}
            className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-sm transition"
          >
            나가기
          </button>
        </div>
      </div>

      {/* 고정 주제 바 */}
      <button
        onClick={() => { setTopicInput(currentRoom?.topic || ""); setShowTopicEdit(true); }}
        className="w-full flex items-center gap-2 px-4 py-2 bg-orange-50 border-b border-orange-100 active:bg-orange-100 transition-colors shrink-0"
      >
        <span className="text-sm">📌</span>
        <p className="text-xs font-bold text-orange-500 flex-1 text-left truncate">
          {currentRoom?.topic || "주제를 설정해보세요 (탭하여 편집)"}
        </p>
        <span className="text-orange-300 text-xs">✏️</span>
      </button>

      {/* 멤버 */}
      <div className="px-4 py-2 border-b border-orange-100 bg-white/60 backdrop-blur-md">
        <div className="text-xs text-[#c09070] truncate font-semibold">
          👥 {currentRoom?.members.join(", ")}
        </div>
      </div>

      {/* 메시지 */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3">
        {messages.map((m, i) => {
          const isMine = m.from === nickname;
          const prev = messages[i - 1];
          const showUser = !prev || prev.from !== m.from;
          const currentDate = formatDateLabel(m.createdAt);
          const prevDate = i > 0 ? formatDateLabel(messages[i - 1].createdAt) : null;
          const showDate = currentDate !== prevDate;

          if (m.type === "urgent") return (
            <div key={m.id}>
              {showDate && (
                <div className="flex items-center justify-center text-xs text-gray-400 w-full my-2">
                  <div className="flex-1 border-t" />
                  <span className="px-2">{currentDate}</span>
                  <div className="flex-1 border-t" />
                </div>
              )}
              <div className="flex justify-center my-2">
                <div className="bg-red-500 text-white text-xs font-black px-4 py-2.5 rounded-2xl shadow-[0_4px_16px_rgba(239,68,68,0.4)] max-w-[85%] text-center animate-[pulse_2s_infinite]">
                  {m.content}
                </div>
              </div>
            </div>
          );

          if (m.from === "시스템") return (
            <div key={m.id}>
              {showDate && (
                <div className="flex items-center justify-center text-xs text-gray-400 w-full my-2">
                  <div className="flex-1 border-t" />
                  <span className="px-2">{currentDate}</span>
                  <div className="flex-1 border-t" />
                </div>
              )}
              <div className="flex justify-center">
                <span className="text-[10px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{m.content}</span>
              </div>
            </div>
          );

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
                <div className="max-w-[80%]">
                  {!isMine && showUser && (
                    <div className="flex items-center gap-1.5 mb-1 ml-1">
                      <span className="text-xs text-gray-400">{m.from}</span>
                      {memberTitles[m.from] && TITLE_MAP[memberTitles[m.from]] && (
                        <span className="text-[10px] bg-orange-50 text-orange-400 font-black px-1.5 py-0.5 rounded-full">
                          {TITLE_MAP[memberTitles[m.from]].icon} {TITLE_MAP[memberTitles[m.from]].name}
                        </span>
                      )}
                    </div>
                  )}
                  <div className={`px-4 py-3 rounded-3xl text-sm shadow-sm ${
                    isMine
                      ? "bg-gradient-to-r from-yellow-300 to-orange-300 text-white rounded-br-md"
                      : "bg-white border border-gray-100 rounded-bl-md"
                  }`}>
                    {m.type === "image" ? (
                      <img
                        src={m.content}
                        alt="이미지"
                        className="max-w-[220px] max-h-[220px] rounded-2xl object-cover cursor-pointer"
                        onClick={() => window.open(m.content, "_blank")}
                      />
                    ) : (
                      <span className="break-words whitespace-pre-wrap">{m.content}</span>
                    )}
                  </div>
                  <div className={`mt-1 text-[10px] text-gray-400 flex ${isMine ? "justify-end" : "justify-start"}`}>
                    {formatTime(m.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={imgUploading}
          className={`w-10 h-10 rounded-[12px] bg-orange-50 flex items-center justify-center text-lg ${imgUploading ? "animate-pulse" : "hover:bg-orange-100"}`}
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
          className="flex-1 h-11 rounded-[16px] bg-gray-50 border border-gray-100 px-4 text-sm outline-none text-[#3d1f00] placeholder:text-[#d4a07a]"
          placeholder="메시지 입력"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) sendMessage();
          }}
        />
        <button
          onClick={startVoice}
          className={`w-10 h-10 rounded-[12px] flex items-center justify-center transition shrink-0 ${isListening ? "bg-red-100 text-red-500 animate-pulse" : "bg-orange-50 hover:bg-orange-100 text-orange-400"}`}
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
          className="w-11 h-11 rounded-[14px] bg-gradient-to-r from-orange-400 to-amber-300 text-white shadow-[0_4px_14px_rgba(255,160,50,0.35)] hover:scale-105 active:scale-95 transition shrink-0"
        >
          ➤
        </button>
      </div>

      {/* 주제 편집 모달 */}
      {showTopicEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowTopicEdit(false)}>
          <div className="w-full bg-white rounded-t-[28px] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-black text-gray-800 text-lg">📌 회의 주제 설정</p>
            <input
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="오늘 회의 주제를 입력하세요"
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
              autoFocus
            />
            <button
              onClick={saveTopic}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-300 text-white font-black text-base shadow-md active:scale-95 transition-transform"
            >
              저장
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // 방 목록
  const renderRoomList = () => (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-4 py-4 border-b border-orange-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              WAGIE MEETING
            </span>
            <button
              onClick={() => router.push("/groupchat")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 transition active:scale-90"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="text-xs font-bold text-orange-500">일반</span>
            </button>
            <button
              onClick={() => router.push("/meetingroom")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-100 transition active:scale-90"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
                <line x1="7" y1="8" x2="17" y2="8" />
                <line x1="7" y1="12" x2="13" y2="12" />
              </svg>
              <span className="text-xs font-bold text-red-500">회의</span>
            </button>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">회의방</div>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-orange-100">
        {showCreate ? (
          <div className="flex flex-col gap-2">
            <input
              className="w-full h-11 rounded-[16px] bg-white border border-gray-100 px-4 text-sm outline-none text-[#3d1f00] placeholder:text-[#d4a07a]"
              placeholder="회의방 이름 입력"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createRoom()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={createRoom}
                className="flex-1 h-11 rounded-[16px] bg-gradient-to-r from-orange-400 to-amber-300 text-white font-black shadow-[0_4px_14px_rgba(255,160,50,0.3)]"
              >
                만들기
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewRoomName(""); }}
                className="flex-1 h-11 rounded-[16px] bg-white border border-gray-100 text-[#c09070] font-semibold"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full h-11 rounded-[16px] bg-gradient-to-r from-orange-400 to-amber-300 text-white font-black shadow-[0_4px_14px_rgba(255,160,50,0.3)]"
          >
            + 회의방 만들기
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => setCurrentRoom(room)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-[18px] mb-2 border shadow-sm transition text-left ${
              currentRoom?.id === room.id
                ? "bg-gradient-to-r from-orange-200 to-amber-100 border-orange-200 shadow-sm"
                : "bg-white/80 hover:bg-orange-50 border-orange-100"
            }`}
          >
            {room.profileImage ? (
              <img src={room.profileImage} alt="프로필" className="w-11 h-11 rounded-full object-cover shadow shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-300 to-orange-300 text-white font-bold flex items-center justify-center shadow shrink-0">
                {room.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm truncate text-[#3d1f00]">{room.name}</div>
              {room.topic ? (
                <div className="text-xs truncate text-orange-400 font-semibold mt-0.5">📌 {room.topic}</div>
              ) : (
                <div className="text-xs truncate text-[#c09070]">멤버 {room.members.length}명</div>
              )}
            </div>
            {(unreadCounts[room.id] ?? 0) > 0 && (
              <div className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-black flex items-center justify-center shadow shrink-0">
                {unreadCounts[room.id] > 99 ? "99+" : unreadCounts[room.id]}
              </div>
            )}
          </button>
        ))}

        {rooms.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center text-gray-400 mt-16">
            <div className="text-6xl mb-4">📋</div>
            <div className="font-semibold">아직 회의방이 없어요</div>
            <div className="text-sm mt-1">새 회의방을 만들어봐요</div>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    if (currentRoom) {
      return (
        <div className="fixed inset-0 z-40 flex flex-col bg-gray-50">
          {renderRoom()}
          {renderInviteModal()}
        </div>
      );
    }
    return (
      <PageContainer>
        <div className="flex flex-col">
          {renderRoomList()}
          {renderInviteModal()}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="h-screen flex overflow-hidden bg-gray-50 rounded-none md:rounded-3xl shadow-xl">
        <div className="w-[320px] border-r border-orange-100">
          {renderRoomList()}
        </div>
        <div className="flex-1 flex flex-col">
          {currentRoom ? (
            renderRoom()
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
              <div className="text-7xl mb-5">📋</div>
              <div className="text-2xl font-bold text-gray-700">회의를 시작해봐요</div>
              <div className="text-gray-400 mt-2">왼쪽에서 회의방을 선택해주세요</div>
            </div>
          )}
        </div>
      </div>
      {renderInviteModal()}
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
