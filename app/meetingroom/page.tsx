"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageContainer from "../../components/PageContainer";
import { db, storage } from "@/app/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
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
  setDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  where,
  getDocs,
  getDoc,
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
  type?: "text" | "image" | "urgent" | "audio";
  createdAt?: any;
  readBy?: string[];
  replyTo?: { id: string; from: string; content: string };
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
  const [isSending, setIsSending] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ msgId: string; x: number; y: number; isMine: boolean; msg: any } | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; from: string; content: string; type: string } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hlSel, setHlSel] = useState({ start: 0, end: 0 });
  const [hlColor, setHlColor] = useState("y");
  const [showHlPicker, setShowHlPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingAudio, setPendingAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [sendingAudio, setSendingAudio] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [inviting, setInviting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [sendingImage, setSendingImage] = useState(false);
  const [editingRoomName, setEditingRoomName] = useState(false);
  const [newRoomNameEdit, setNewRoomNameEdit] = useState("");
  const [showTopicEdit, setShowTopicEdit] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const msgInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
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
    const unsub = watchAuthState(async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        setNickname(snap.exists() ? (snap.data().nickname || "유저") : (user.displayName || "유저"));
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

  // 타이핑 구독
  useEffect(() => {
    if (!currentRoom || !nickname) return;
    const unsub = onSnapshot(doc(db, "meeting_typing", currentRoom.id), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const now = Date.now();
      const typers = Object.entries(data)
        .filter(([k, v]: any) => k !== nickname && v.isTyping && now - v.updatedAt < 5000)
        .map(([, v]: any) => v.nickname as string);
      setTypingUsers(typers);
    }, () => { setTypingUsers([]); });
    return () => unsub();
  }, [currentRoom?.id, nickname]);

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

  const sendTyping = async (isTyping: boolean) => {
    if (!currentRoom || !nickname) return;
    try {
      await setDoc(doc(db, "meeting_typing", currentRoom.id), {
        [nickname]: { isTyping, nickname, updatedAt: Date.now() },
      }, { merge: true });
    } catch { /* 타이핑 표시 실패는 무시 */ }
  };

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
        .filter((u) => u.nickname !== nickname && u.nickname !== "Stella" && u.nickname !== "관리자");
      list.sort((a, b) => (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko"));
      setAllUsers(list);
    });
  }, [nickname]);

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

  const saveRoomName = async () => {
    if (!currentRoom || !newRoomNameEdit.trim()) return;
    await updateDoc(doc(db, "meeting_rooms", currentRoom.id), { name: newRoomNameEdit.trim() });
    setEditingRoomName(false);
  };

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
    if (!pendingAudio || sendingAudio || !nickname || !currentRoom) return;
    setSendingAudio(true);
    try {
      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(pendingAudio.blob);
        reader.onloadend = async () => {
          try {
            await addDoc(collection(db, "meeting_rooms", currentRoom.id, "messages"), {
              from: nickname,
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

  const openCtxMenu = (e: React.MouseEvent | React.TouchEvent, m: any, isMine: boolean) => {
    let x = 0, y = 0;
    if ("touches" in e) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
    else { e.preventDefault(); x = e.clientX; y = e.clientY; }
    const menuW = 176, menuH = isMine ? 108 : 60;
    if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 8;
    if (x < 8) x = 8;
    if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8;
    if (y < 8) y = 8;
    setCtxMenu({ msgId: m.id, x, y, isMine, msg: m });
  };
  const handleTouchStart = (e: React.TouchEvent, m: any, isMine: boolean) => {
    longPressTimer.current = setTimeout(() => openCtxMenu(e, m, isMine), 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const deleteMeetingMsg = async (msgId: string) => {
    if (!currentRoom) return;
    await deleteDoc(doc(db, "meeting_rooms", currentRoom.id, "messages", msgId));
    setCtxMenu(null);
  };

  const sendMessage = async (textOverride?: string) => {
    const rawInput = textOverride ?? input;
    if (!rawInput.trim() || !nickname || !currentRoom || isSending) return;
    const text = rawInput.trim();
    setIsSending(true);
    try {
      await addDoc(collection(db, "meeting_rooms", currentRoom.id, "messages"), {
        from: nickname,
        content: text,
        type: "text",
        createdAt: serverTimestamp(),
        readBy: [nickname],
        ...(replyTo ? { replyTo: { id: replyTo.id, from: replyTo.from, content: replyTo.content } } : {}),
      });
      setReplyTo(null);
      setInput("");
    } catch {
      alert("메시지 전송에 실패했어요. 다시 시도해줘!");
    } finally {
      setIsSending(false);
    }
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
    const base64 = await compressToBase64(file);
    await addDoc(collection(db, "meeting_rooms", currentRoom.id, "messages"), {
      from: nickname,
      content: base64,
      type: "image",
      createdAt: serverTimestamp(),
      readBy: [nickname],
    });
  };

  const inviteUser = async (targetNickname: string) => {
    if (!currentRoom || inviting) return;

    const targetUser = allUsers.find((u) => u.nickname === targetNickname);
    if (!targetUser) return;

    setInviting(true);
    try {
      await addDoc(collection(db, "room_invitations"), {
        from: nickname,
        fromNickname: nickname,
        toUid: targetUser.id,
        toNickname: targetNickname,
        roomId: currentRoom.id,
        roomName: currentRoom.name,
        roomType: "meeting",
        status: "pending",
        createdAt: serverTimestamp(),
      });
      fetch("/api/push", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toNickname: targetNickname, fromNickname: nickname, message: `${currentRoom.name} 회의방에 초대되었어요! 📋` }),
      }).catch(() => {});
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

  // 초대 모달
  const renderInviteModal = () => {
    if (!showInvite || !currentRoom) return null;
    const notInRoom = allUsers.filter((u) => !currentRoom.members.includes(u.nickname));
    return (
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        onClick={() => setShowInvite(false)}
      >
        <div className="w-80 bg-white rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
          <div className="text-lg font-bold text-gray-800 mb-4">사용자 초대</div>
          <div className="max-h-[350px] overflow-y-auto flex flex-col gap-2">
            {notInRoom.map((u) => (
              <button
                key={u.id}
                disabled={inviting}
                onClick={() => inviteUser(u.nickname)}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-gray-50 transition text-left"
              >
                <div className="w-11 h-11 rounded-full bg- text-white font-bold flex items-center justify-center shadow">
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
      <div className="px-4 py-3 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentRoom(null)} className="text-gray-500 text-lg px-1">←</button>

          <div className="relative shrink-0 group">
            {currentRoom?.profileImage ? (
              <img src={currentRoom.profileImage} alt="프로필" className="w-11 h-11 rounded-full object-cover shadow" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-yellow-200 text-white font-bold flex items-center justify-center shadow">
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
            {editingRoomName ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={newRoomNameEdit}
                  onChange={(e) => setNewRoomNameEdit(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveRoomName(); if (e.key === "Escape") setEditingRoomName(false); }}
                  className="h-7 px-2 rounded-lg text-sm outline-none text-gray-800 w-32"
                />
                <button onClick={saveRoomName} className="text-xs text-sky-600 font-bold px-2 py-1 bg-sky-50 rounded-lg">저장</button>
                <button onClick={() => setEditingRoomName(false)} className="text-xs text-gray-400 px-1">✕</button>
              </div>
            ) : (
              <button
                onClick={() => { setNewRoomNameEdit(currentRoom?.name || ""); setEditingRoomName(true); }}
                className="font-bold text-gray-800 hover:text-sky-600 transition text-left flex items-center gap-1"
              >
                {currentRoom?.name}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
            <div className="text-xs text-gray-400">멤버 {currentRoom?.members.length}명</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                  onClick={() => { setShowHeaderMenu(false); sendUrgent(); }}
                  className="w-full px-4 py-3 text-left text-sm text-red-600 font-bold hover:bg-red-50 transition"
                >
                  🚨 긴급
                </button>
                <button
                  onClick={() => { setShowHeaderMenu(false); setShowInvite(true); }}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  초대
                </button>
                <button
                  onClick={() => { setShowHeaderMenu(false); leaveRoom(); }}
                  className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition"
                >
                  나가기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 고정 주제 바 */}
      <button
        onClick={() => { setTopicInput(currentRoom?.topic || ""); setShowTopicEdit(true); }}
        className="w-full flex items-center gap-2 px-4 py-2 bg-sky-50 active:bg-sky-200 transition-colors shrink-0"
      >
        <span className="text-sm">📌</span>
        <p className="text-xs font-bold text-sky-600 flex-1 text-left truncate">
          {currentRoom?.topic || "주제를 설정해보세요 (탭하여 편집)"}
        </p>
        <span className="text-orange-300 text-xs">✏️</span>
      </button>

      {/* 멤버 */}
      <div className="px-4 py-2 bg-white/60">
        <div className="text-xs text-sky-600 truncate font-semibold">
          👥 {currentRoom?.members.join(", ")}
        </div>
      </div>

      {/* 메시지 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 flex flex-col gap-3">
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
                <div className="bg-red-500 text-white text-xs font-black px-4 py-2.5 rounded-2xl max-w-[85%] text-center animate-[pulse_2s_infinite]">
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
                    </div>
                  )}
                  <div className={`px-4 py-3 rounded-3xl text-sm ${
                    isMine
                      ? "bg-sky-400 text-white rounded-br-md"
                      : "bg-white rounded-bl-md"
                  }`}
                    onContextMenu={(e) => openCtxMenu(e, m, isMine)}
                    onTouchStart={(e) => handleTouchStart(e, m, isMine)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                  >
                    {m.replyTo && (
                      <div className={`mb-2 px-2 py-1 rounded-xl border-l-4 text-xs opacity-70 ${isMine ? "border-white/60 bg-white/20" : "border-sky-300 bg-sky-50"}`}>
                        <span className="font-bold">{m.replyTo.from}</span>: {m.replyTo.content?.slice(0, 60)}{(m.replyTo.content?.length ?? 0) > 60 ? "…" : ""}
                      </div>
                    )}
                    {m.type === "image" ? (
                      <img
                        src={m.content}
                        alt="이미지"
                        className="max-w-[220px] max-h-[220px] rounded-2xl object-cover cursor-pointer"
                        onClick={() => setLightboxSrc(m.content)}
                      />
                    ) : m.type === "audio" ? (
                      <audio src={m.content} controls className="max-w-[220px] rounded-xl" />
                    ) : (
                      <span className="break-words whitespace-pre-wrap">{renderHighlighted(m.content)}</span>
                    )}
                  </div>
                  <div className={`mt-1 text-[10px] text-gray-400 flex items-center gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                    {(() => {
                      const unread = (currentRoom?.members.length || 0) - (m.readBy?.length || 0);
                      return unread > 0 ? (
                        <span className="text-sky-600 font-bold">{unread}</span>
                      ) : null;
                    })()}
                    {formatTime(m.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {typingUsers.length > 0 && (
          <div className="flex items-end gap-2 animate-[fadeInUp_0.2s_ease]">
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sm font-bold text-sky-500 shrink-0">
              {typingUsers[0][0]}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400 px-1">
                {typingUsers.length === 1 ? typingUsers[0] : `${typingUsers[0]} 외 ${typingUsers.length - 1}명`}
              </span>
              <div className="bg-white rounded-[18px] rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" style={{animation:"typingDot 1.2s ease-in-out infinite", animationDelay:"0ms"}} />
                <span className="w-2 h-2 rounded-full bg-sky-400" style={{animation:"typingDot 1.2s ease-in-out infinite", animationDelay:"200ms"}} />
                <span className="w-2 h-2 rounded-full bg-sky-400" style={{animation:"typingDot 1.2s ease-in-out infinite", animationDelay:"400ms"}} />
              </div>
            </div>
          </div>
        )}

        {isSending && (
          <div className="flex justify-end">
            <div className="bg-sky-400 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
              <span className="flex gap-1 items-center py-0.5">
                <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:0ms]"/>
                <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:150ms]"/>
                <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:300ms]"/>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

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

      {/* 입력창 */}
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

      {replyTo && (
        <div className="px-4 py-2 bg-sky-50 border-t border-sky-100 flex items-center gap-2 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-sky-500">↩ {replyTo.from}에게 답장</p>
            <p className="text-xs text-gray-500 truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 text-sm font-bold shrink-0">✕</button>
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

        {/* + 버튼 */}
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
          placeholder="메시지 입력"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            sendTyping(true);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => sendTyping(false), 2000);
          }}
          onSelect={(e) => {
            const el = e.currentTarget;
            setHlSel({ start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 });
          }}
          onBlur={(e) => {
            setHlSel({ start: e.currentTarget.selectionStart ?? 0, end: e.currentTarget.selectionEnd ?? 0 });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) sendMessage();
          }}
        />

        <button
          onClick={() => sendMessage()}
          className="w-11 h-11 rounded-[14px] bg-sky-400 text-white hover:scale-105 active:scale-95 transition shrink-0 flex items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
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
              className="w-full h-12 rounded-2xl bg-sky-200 text-white font-black text-base active:scale-95 transition-transform"
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
      <div className="px-4 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black bg-yellow-200">
              WAGIE MEETING
            </span>
            <button
              onClick={() => router.push("/groupchat")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-50 hover:bg-sky-200 transition active:scale-90"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="text-xs font-bold text-sky-600">일반</span>
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
            <button
              onClick={() => router.push("/openchat")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-yellow-50 hover:bg-yellow-100 transition active:scale-90"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span className="text-xs font-bold text-yellow-600">오픈</span>
            </button>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">회의방</div>
        </div>
      </div>

      <div className="px-3 py-3">
        {showCreate ? (
          <div className="flex flex-col gap-2">
            <input
              className="w-full h-11 rounded-[16px] bg-white border border-sky-200 px-4 text-sm outline-none text-slate-800 placeholder:text-slate-400"
              placeholder="회의방 이름 입력"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createRoom()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={createRoom}
                className="flex-1 h-11 rounded-[16px] bg-sky-200 text-white font-black"
              >
                만들기
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewRoomName(""); }}
                className="flex-1 h-11 rounded-[16px] bg-white text-sky-600 font-semibold"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full h-11 rounded-[16px] bg-sky-200 text-white font-black"
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
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-[18px] mb-2 border transition text-left ${
              currentRoom?.id === room.id
                ? "bg-sky-200"
                : "bg-white/80 hover:bg-sky-50 border-sky-200"
            }`}
          >
            {room.profileImage ? (
              <img src={room.profileImage} alt="프로필" className="w-11 h-11 rounded-full object-cover shadow shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-yellow-200 text-white font-bold flex items-center justify-center shadow shrink-0">
                {room.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm truncate text-slate-800">{room.name}</div>
              {room.topic ? (
                <div className="text-xs truncate text-sky-600 font-semibold mt-0.5">📌 {room.topic}</div>
              ) : (
                <div className="text-xs truncate text-sky-600">멤버 {room.members.length}명</div>
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

  if (currentRoom) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-gray-50">
        {renderRoom()}
        {renderInviteModal()}
        {ctxMenu && (
          <div className="fixed inset-0 z-[200]" onClick={() => setCtxMenu(null)}>
            <div className="fixed bg-white rounded-3xl shadow-2xl overflow-hidden w-44" style={{ top: ctxMenu.y, left: ctxMenu.x }} onClick={(e) => e.stopPropagation()}>
              <button className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm" onClick={() => { setReplyTo({ id: ctxMenu.msgId, from: ctxMenu.msg.from, content: ctxMenu.msg.content, type: ctxMenu.msg.type }); setCtxMenu(null); }}>↩ 답장</button>
              {ctxMenu.isMine && (
                <button className="w-full px-4 py-3 text-left hover:bg-red-50 text-red-500 text-sm" onClick={() => deleteMeetingMsg(ctxMenu.msgId)}>🗑️ 삭제</button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col">
        {renderRoomList()}
        {renderInviteModal()}
      </div>
      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="이미지"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/20 text-white text-xl flex items-center justify-center"
            onClick={() => setLightboxSrc(null)}
          >✕</button>
        </div>
      )}
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
