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

type GroupRoom = {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt?: any;
  profileImage?: string;
  isSecret?: boolean;
  password?: string;
  maxMembers?: number;
  inviteOnly?: boolean;
};

type GroupMessage = {
  id: string;
  from: string;
  content: string;
  type?: "text" | "image" | "audio" | "video";
  createdAt?: any;
  readBy?: string[];
};

type User = {
  id: string;
  nickname: string;
};

export default function GroupChat() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [memberTitles, setMemberTitles] = useState<Record<string, string>>({});

  const [rooms, setRooms] = useState<GroupRoom[]>([]);

  const [currentRoom, setCurrentRoom] =
    useState<GroupRoom | null>(null);

  const [messages, setMessages] = useState<
    GroupMessage[]
  >([]);

  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newIsSecret, setNewIsSecret] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newMaxMembers, setNewMaxMembers] = useState("");
  const [newInviteOnly, setNewInviteOnly] = useState(false);

  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [settingSecret, setSettingSecret] = useState(false);
  const [settingPassword, setSettingPassword] = useState("");
  const [settingMaxMembers, setSettingMaxMembers] = useState("");
  const [settingInviteOnly, setSettingInviteOnly] = useState(false);

  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingInviteTarget, setPendingInviteTarget] = useState<string | null>(null);
  const [enteredPassword, setEnteredPassword] = useState("");

  const [showInvite, setShowInvite] =
    useState(false);

  const [allUsers, setAllUsers] = useState<
    User[]
  >([]);

  const [inviting, setInviting] =
    useState(false);

  const [isMobile, setIsMobile] =
    useState(false);

  const [imgUploading, setImgUploading] =
    useState(false);

  const [profileUploading, setProfileUploading] =
    useState(false);

  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const imageInputRef =
    useRef<HTMLInputElement>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const profileInputRef =
    useRef<HTMLInputElement>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const check = () =>
      setIsMobile(window.innerWidth < 768);

    check();

    window.addEventListener("resize", check);

    return () =>
      window.removeEventListener(
        "resize",
        check
      );
  }, []);

  useEffect(() => {
    const unsub = watchAuthState((user) => {
      if (user) {
        setNickname(
          user.displayName || "유저"
        );
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
      collection(db, "group_rooms"),
      where(
        "members",
        "array-contains",
        nickname
      )
    );

    return onSnapshot(q, (snap) => {
      const list: GroupRoom[] =
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<
            GroupRoom,
            "id"
          >),
        }));

      list.sort((a, b) => {
        const ta =
          a.createdAt
            ?.toDate?.()
            ?.getTime() ?? 0;

        const tb =
          b.createdAt
            ?.toDate?.()
            ?.getTime() ?? 0;

        return tb - ta;
      });

      setRooms(list);

      const roomParam = searchParams.get("room");
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
      const q = query(collection(db, "group_rooms", room.id, "messages"));
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

    const updated = rooms.find(
      (r) => r.id === currentRoom.id
    );

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
      collection(
        db,
        "group_rooms",
        currentRoom.id,
        "messages"
      ),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const msgs: GroupMessage[] = [];

        for (const d of snap.docs) {
          const data = d.data();

          const m: GroupMessage = {
            id: d.id,
            from: data.from,
            content: data.content,
            type: data.type || "text",
            createdAt: data.createdAt,
            readBy: data.readBy || [],
          };

          if (
            m.from !== nickname &&
            !m.readBy?.includes(nickname)
          ) {
            await updateDoc(
              doc(
                db,
                "group_rooms",
                currentRoom.id,
                "messages",
                m.id
              ),
              {
                readBy: arrayUnion(nickname),
              }
            );
          }

          msgs.push(m);
        }

        setMessages(msgs);

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView(
            {
              behavior: "smooth",
            }
          );
        }, 50);
      }
    );

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

    return onSnapshot(
      collection(db, "users"),
      (snap) => {
        const list: User[] = snap.docs
          .map((d) => ({
            id: d.id,
            nickname:
              d.data().nickname as string,
          }))
          .filter(
            (u) => u.nickname !== nickname
          );

        setAllUsers(list);
      }
    );
  }, [nickname]);

  const sendAudio = async (blob: Blob) => {
    if (!nickname || !currentRoom) return;
    try {
      const path = `audio_messages/${nickname}/${Date.now()}.webm`;
      const fRef = storageRef(storage, path);
      await uploadBytes(fRef, blob);
      const url = await getDownloadURL(fRef);
      await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), {
        from: nickname, content: url, type: "audio",
        createdAt: serverTimestamp(), readBy: [nickname],
      });
    } catch { alert("오디오 업로드 실패"); }
  };

  const sendVideo = async (file: File) => {
    if (!nickname || !currentRoom) return;
    setImgUploading(true);
    try {
      const path = `video_messages/${nickname}/${Date.now()}_${file.name}`;
      const fRef = storageRef(storage, path);
      await uploadBytes(fRef, file);
      const url = await getDownloadURL(fRef);
      await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), {
        from: nickname, content: url, type: "video",
        createdAt: serverTimestamp(), readBy: [nickname],
      });
    } catch { alert("비디오 업로드 실패"); }
    finally { setImgUploading(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await sendAudio(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setShowMediaMenu(false);
    } catch { alert("마이크 권한이 필요해요"); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const createRoom = async () => {
    if (!newRoomName.trim() || !nickname) return;
    await addDoc(collection(db, "group_rooms"), {
      name: newRoomName.trim(),
      members: [nickname],
      createdBy: nickname,
      createdAt: serverTimestamp(),
      isSecret: newIsSecret,
      password: newIsSecret ? newPassword.trim() : "",
      maxMembers: newMaxMembers ? parseInt(newMaxMembers) : 0,
      inviteOnly: newInviteOnly,
    });
    setNewRoomName(""); setNewIsSecret(false); setNewPassword("");
    setNewMaxMembers(""); setNewInviteOnly(false);
    setShowCreate(false);
  };

  const saveRoomSettings = async () => {
    if (!currentRoom) return;
    await updateDoc(doc(db, "group_rooms", currentRoom.id), {
      isSecret: settingSecret,
      password: settingSecret ? settingPassword.trim() : "",
      maxMembers: settingMaxMembers ? parseInt(settingMaxMembers) : 0,
      inviteOnly: settingInviteOnly,
    });
    setShowRoomSettings(false);
  };

  const openRoomSettings = () => {
    if (!currentRoom) return;
    setSettingSecret(currentRoom.isSecret || false);
    setSettingPassword(currentRoom.password || "");
    setSettingMaxMembers(currentRoom.maxMembers ? String(currentRoom.maxMembers) : "");
    setSettingInviteOnly(currentRoom.inviteOnly || false);
    setShowRoomSettings(true);
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
    if (
      !input.trim() ||
      !nickname ||
      !currentRoom
    )
      return;

    const text = input.trim();

    await addDoc(
      collection(
        db,
        "group_rooms",
        currentRoom.id,
        "messages"
      ),
      {
        from: nickname,
        content: text,
        type: "text",
        createdAt: serverTimestamp(),
        readBy: [nickname],
      }
    );

    const targets = currentRoom.members.filter((m) => m !== nickname);
    if (targets.length > 0) {
      fetch("/api/fcm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toNicknames: targets,
          fromNickname: nickname,
          message: text.length > 60 ? text.slice(0, 60) + "…" : text,
          roomName: currentRoom.name,
          url: `/groupchat?room=${currentRoom.id}`,
        }),
      }).catch(() => {});
    }

    setInput("");
  };

  const compressToBase64 = (
    file: File,
    maxPx = 800
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();

      const url = URL.createObjectURL(file);

      img.onload = () => {
        const ratio = Math.min(
          maxPx / img.width,
          maxPx / img.height,
          1
        );

        const canvas =
          document.createElement("canvas");

        canvas.width = img.width * ratio;
        canvas.height =
          img.height * ratio;

        canvas
          .getContext("2d")
          ?.drawImage(
            img,
            0,
            0,
            canvas.width,
            canvas.height
          );

        URL.revokeObjectURL(url);

        resolve(
          canvas.toDataURL(
            "image/jpeg",
            0.8
          )
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);

        reject(
          new Error("이미지 로드 실패")
        );
      };

      img.src = url;
    });

  const sendImage = async (file: File) => {
    if (!nickname || !currentRoom) return;

    setImgUploading(true);

    try {
      const base64 =
        await compressToBase64(file);

      await addDoc(
        collection(
          db,
          "group_rooms",
          currentRoom.id,
          "messages"
        ),
        {
          from: nickname,
          content: base64,
          type: "image",
          createdAt: serverTimestamp(),
          readBy: [nickname],
        }
      );

      const targets = currentRoom.members.filter((m) => m !== nickname);
      if (targets.length > 0) {
        fetch("/api/fcm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toNicknames: targets,
            fromNickname: nickname,
            message: "📷 사진을 보냈어요",
            roomName: currentRoom.name,
            url: `/groupchat?room=${currentRoom.id}`,
          }),
        }).catch(() => {});
      }
    } finally {
      setImgUploading(false);
    }
  };

  const inviteUser = async (targetNickname: string, pw?: string) => {
    if (!currentRoom || inviting) return;

    if (currentRoom.inviteOnly && currentRoom.createdBy !== nickname) {
      alert("이 방은 방장만 초대할 수 있어요.");
      return;
    }
    if (currentRoom.maxMembers && currentRoom.members.length >= currentRoom.maxMembers) {
      alert(`최대 인원(${currentRoom.maxMembers}명)에 도달했어요.`);
      return;
    }
    if (currentRoom.isSecret && currentRoom.password) {
      const check = pw ?? enteredPassword;
      if (check !== currentRoom.password) {
        alert("비밀번호가 틀렸어요.");
        return;
      }
    }

    setInviting(true);
    try {
      await updateDoc(doc(db, "group_rooms", currentRoom.id), {
        members: arrayUnion(targetNickname),
      });
      setShowInvite(false);
      setShowPasswordPrompt(false);
      setEnteredPassword("");
      setPendingInviteTarget(null);
    } finally {
      setInviting(false);
    }
  };

  const handleInviteClick = (targetNickname: string) => {
    if (currentRoom?.isSecret && currentRoom?.password) {
      setPendingInviteTarget(targetNickname);
      setEnteredPassword("");
      setShowPasswordPrompt(true);
    } else {
      inviteUser(targetNickname);
    }
  };

  const leaveRoom = async () => {
    if (!currentRoom || !nickname) return;

    if (
      !confirm(
        `"${currentRoom.name}" 방에서 나가시겠습니까?`
      )
    )
      return;

    await updateDoc(
      doc(
        db,
        "group_rooms",
        currentRoom.id
      ),
      {
        members: arrayRemove(nickname),
      }
    );

    setCurrentRoom(null);
  };

  const changeProfileImage = async (
    file: File
  ) => {
    if (!currentRoom) return;

    setProfileUploading(true);

    try {
      const base64 =
        await compressToBase64(file);

      await updateDoc(
        doc(
          db,
          "group_rooms",
          currentRoom.id
        ),
        {
          profileImage: base64,
        }
      );
    } finally {
      setProfileUploading(false);
    }
  };

  if (!nickname) {
    return (
      <div className="h-screen flex items-center justify-center">
        로딩중...
      </div>
    );
  }

  // 초대 모달
  const renderInviteModal = () => {
    if (!showInvite || !currentRoom)
      return null;

    const notInRoom = allUsers.filter(
      (u) =>
        !currentRoom.members.includes(
          u.nickname
        )
    );

    return (
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        onClick={() =>
          setShowInvite(false)
        }
      >
        <div
          className="w-80 bg-white rounded-3xl shadow-2xl p-5"
          onClick={(e) =>
            e.stopPropagation()
          }
        >
          <div className="text-lg font-bold text-gray-800 mb-4">
            사용자 초대
          </div>

          <div className="max-h-[350px] overflow-y-auto flex flex-col gap-2">
            {notInRoom.map((u) => (
              <button
                key={u.id}
                disabled={inviting}
                onClick={() =>
                  handleInviteClick(u.nickname)
                }
                className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-gray-50 transition text-left"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-300 to-orange-300 text-white font-bold flex items-center justify-center shadow">
                  {u.nickname[0]}
                </div>

                <div className="flex-1">
                  <div className="font-semibold text-gray-800">
                    {u.nickname}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() =>
              setShowInvite(false)
            }
            className="mt-4 w-full h-11 rounded-2xl bg-gray-100 hover:bg-gray-200 text-sm"
          >
            닫기
          </button>
        </div>
      </div>
    );
  };

  // 방 설정 시트
  const renderRoomSettings = () => {
    if (!showRoomSettings || !currentRoom) return null;
    return (
      <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={() => setShowRoomSettings(false)}>
        <div className="w-full bg-white rounded-t-[28px] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="text-lg font-black text-gray-800">방 설정</div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span className="font-bold text-sm text-gray-700">비밀방</span>
              </div>
              <button onClick={() => setSettingSecret(!settingSecret)} className={`relative w-12 h-6 rounded-full transition-colors ${settingSecret ? "bg-orange-400" : "bg-gray-200"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settingSecret ? "translate-x-[24px]" : "translate-x-0"}`}/>
              </button>
            </div>
            {settingSecret && (
              <input className="w-full h-11 rounded-xl bg-gray-50 border border-gray-100 px-4 text-sm outline-none text-[#3d1f00] placeholder:text-[#d4a07a]"
                placeholder="비밀번호 입력" value={settingPassword} onChange={(e) => setSettingPassword(e.target.value)}/>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                <span className="font-bold text-sm text-gray-700">초대 전용 (방장만 초대)</span>
              </div>
              <button onClick={() => setSettingInviteOnly(!settingInviteOnly)} className={`relative w-12 h-6 rounded-full transition-colors ${settingInviteOnly ? "bg-purple-400" : "bg-gray-200"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settingInviteOnly ? "translate-x-[24px]" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <input className="flex-1 h-11 rounded-xl bg-gray-50 border border-gray-100 px-4 text-sm outline-none text-[#3d1f00] placeholder:text-[#d4a07a]"
                placeholder="최대 인원 (빈칸=무제한)" type="number" min="2" value={settingMaxMembers} onChange={(e) => setSettingMaxMembers(e.target.value)}/>
            </div>
          </div>
          <button onClick={saveRoomSettings}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-300 text-white font-black shadow-md active:scale-95 transition-transform">
            저장
          </button>
        </div>
      </div>
    );
  };

  // 비밀번호 입력 프롬프트
  const renderPasswordPrompt = () => {
    if (!showPasswordPrompt || !pendingInviteTarget) return null;
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowPasswordPrompt(false)}>
        <div className="w-80 bg-white rounded-3xl shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span className="font-black text-gray-800">비밀방 비밀번호</span>
          </div>
          <input className="w-full h-11 rounded-xl bg-gray-50 border border-gray-100 px-4 text-sm outline-none text-[#3d1f00] placeholder:text-[#d4a07a]"
            placeholder="비밀번호 입력" type="password" value={enteredPassword}
            onChange={(e) => setEnteredPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && inviteUser(pendingInviteTarget, enteredPassword)}
            autoFocus/>
          <button onClick={() => inviteUser(pendingInviteTarget, enteredPassword)}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-300 text-white font-black shadow-md active:scale-95 transition-transform">
            초대
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
            <button
              onClick={() =>
                setCurrentRoom(null)
              }
              className="text-gray-500"
            >
              ←
            </button>
          )}

          <div className="relative shrink-0 group">
            {currentRoom?.profileImage ? (
              <img
                src={
                  currentRoom.profileImage
                }
                alt="프로필"
                className="w-11 h-11 rounded-full object-cover shadow"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-300 to-orange-300 text-white font-bold flex items-center justify-center shadow">
                {currentRoom?.name[0]}
              </div>
            )}

            <button
              disabled={profileUploading}
              onClick={() =>
                profileInputRef.current?.click()
              }
              className={`absolute inset-0 rounded-full bg-black/40 flex items-center justify-center transition ${
                profileUploading
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
            >
              ✏️
            </button>

            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f =
                  e.target.files?.[0];

                if (f)
                  changeProfileImage(f);

                e.target.value = "";
              }}
            />
          </div>

          <div>
            <div className="font-bold text-gray-800">
              {currentRoom?.name}
            </div>

            <div className="text-xs text-gray-400">
              멤버{" "}
              {currentRoom?.members.length}
              명
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentRoom?.createdBy === nickname && (
            <button
              onClick={openRoomSettings}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-500"
              title="방 설정"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          )}
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

      {/* 멤버 */}
      <div className="px-4 py-2 border-b border-orange-100 bg-white/60 backdrop-blur-md">
        <div className="text-xs text-[#c09070] truncate font-semibold">
          👥{" "}
          {currentRoom?.members.join(", ")}
        </div>
      </div>

      {/* 메시지 */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3">
        {messages.map((m, i) => {
          const isMine =
            m.from === nickname;

          const prev = messages[i - 1];

          const showUser =
            !prev || prev.from !== m.from;

          const currentDate =
            formatDateLabel(
              m.createdAt
            );

          const prevDate =
            i > 0
              ? formatDateLabel(
                  messages[i - 1]
                    .createdAt
                )
              : null;

          const showDate =
            currentDate !== prevDate;

          return (
            <div key={m.id}>
              {showDate && (
                <div className="flex items-center justify-center text-xs text-gray-400 w-full my-2">
                  <div className="flex-1 border-t" />

                  <span className="px-2">
                    {currentDate}
                  </span>

                  <div className="flex-1 border-t" />
                </div>
              )}

              <div
                className={`flex ${
                  isMine
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div className="max-w-[80%]">
                  {!isMine &&
                    showUser && (
                      <div className="flex items-center gap-1.5 mb-1 ml-1">
                        <span className="text-xs text-gray-400">{m.from}</span>
                        {memberTitles[m.from] && TITLE_MAP[memberTitles[m.from]] && (
                          <span className="text-[10px] bg-orange-50 text-orange-400 font-black px-1.5 py-0.5 rounded-full">
                            {TITLE_MAP[memberTitles[m.from]].icon} {TITLE_MAP[memberTitles[m.from]].name}
                          </span>
                        )}
                      </div>
                    )}

                  <div
                    className={`px-4 py-3 rounded-3xl text-sm shadow-sm ${
                      isMine
                        ? "bg-gradient-to-r from-yellow-300 to-orange-300 text-white rounded-br-md"
                        : "bg-white border border-gray-100 rounded-bl-md"
                    }`}
                  >
                    {m.type === "image" ? (
                      <img
                        src={m.content}
                        alt="이미지"
                        className="max-w-[220px] max-h-[220px] rounded-2xl object-cover cursor-pointer"
                        onClick={() => window.open(m.content, "_blank")}
                      />
                    ) : m.type === "audio" ? (
                      <audio controls src={m.content} className="max-w-[240px]" />
                    ) : m.type === "video" ? (
                      <video controls src={m.content} className="max-w-[240px] max-h-[180px] rounded-2xl" />
                    ) : (
                      <span className="break-words whitespace-pre-wrap">
                        {m.content}
                      </span>
                    )}
                  </div>

                  <div
                    className={`mt-1 text-[10px] text-gray-400 flex items-center gap-1 ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    {(() => {
                      const unread = (currentRoom?.members.length || 0) - (m.readBy?.length || 0);
                      return unread > 0 ? (
                        <span className="text-orange-400 font-bold">{unread}</span>
                      ) : null;
                    })()}
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
      {isRecording && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center gap-2 shrink-0 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-red-500 font-bold">녹음 중...</span>
          <button onClick={stopRecording} className="ml-auto text-xs text-red-500 font-bold px-3 py-1 bg-red-100 rounded-xl">중지</button>
        </div>
      )}
      <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
        <div className="relative shrink-0">
          <button
            onClick={() => setShowMediaMenu((p) => !p)}
            disabled={imgUploading}
            className={`w-10 h-10 rounded-[12px] flex items-center justify-center text-xl font-bold transition shrink-0 ${
              imgUploading ? "animate-pulse bg-orange-50 text-orange-300" : "bg-orange-50 hover:bg-orange-100 text-orange-400"
            }`}
          >
            +
          </button>
          {showMediaMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[130px]">
              <button
                onClick={() => { imageInputRef.current?.click(); setShowMediaMenu(false); }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 text-gray-700 font-medium"
              >
                📷 사진
              </button>
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 text-gray-700 font-medium"
                >
                  🎙 녹음
                </button>
              ) : (
                <button
                  onClick={() => { stopRecording(); setShowMediaMenu(false); }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-red-50 text-red-500 font-medium animate-pulse"
                >
                  ⏹ 녹음 중지
                </button>
              )}
              <button
                onClick={() => { videoInputRef.current?.click(); setShowMediaMenu(false); }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 text-gray-700 font-medium"
              >
                🎥 비디오
              </button>
            </div>
          )}
        </div>

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
          type="file"
          ref={videoInputRef}
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) sendVideo(f);
            e.target.value = "";
          }}
        />

        <input
          className="flex-1 h-11 rounded-[16px] bg-gray-50 border border-gray-100 px-4 text-sm outline-none text-[#3d1f00] placeholder:text-[#d4a07a]"
          placeholder="메시지 입력"
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
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
    </div>
  );

  // 방 목록
  const renderRoomList = () => (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-4 py-4 border-b border-orange-100">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
            WAGIE GROUP
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-50 hover:bg-red-100 transition active:scale-90"
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
        <div className="text-xs text-gray-400 mt-0.5">단체 채팅</div>
      </div>

      <div className="px-3 py-3 border-b border-orange-100">
        {showCreate ? (
          <div className="flex flex-col gap-2">
            <input
              className="w-full h-11 rounded-[16px] bg-white border border-gray-100 px-4 text-sm outline-none text-[#3d1f00] placeholder:text-[#d4a07a]"
              placeholder="방 이름 입력"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createRoom()}
              autoFocus
            />

            {/* 조건 설정 */}
            <div className="bg-white rounded-[14px] border border-gray-100 px-3 py-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span className="text-xs font-bold text-gray-600">비밀방</span>
                </div>
                <button onClick={() => setNewIsSecret(!newIsSecret)} className={`relative w-10 h-5 rounded-full transition-colors ${newIsSecret ? "bg-orange-400" : "bg-gray-200"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${newIsSecret ? "translate-x-5" : "translate-x-0"}`}/>
                </button>
              </div>
              {newIsSecret && (
                <input className="w-full h-9 rounded-xl bg-gray-50 border border-gray-100 px-3 text-xs outline-none text-[#3d1f00] placeholder:text-[#d4a07a]"
                  placeholder="비밀번호 입력" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}/>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                  </svg>
                  <span className="text-xs font-bold text-gray-600">초대 전용</span>
                </div>
                <button onClick={() => setNewInviteOnly(!newInviteOnly)} className={`relative w-10 h-5 rounded-full transition-colors ${newInviteOnly ? "bg-purple-400" : "bg-gray-200"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${newInviteOnly ? "translate-x-5" : "translate-x-0"}`}/>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <input className="flex-1 h-8 rounded-xl bg-gray-50 border border-gray-100 px-3 text-xs outline-none text-[#3d1f00] placeholder:text-[#d4a07a]"
                  placeholder="최대 인원 (빈칸=무제한)" type="number" min="2" value={newMaxMembers} onChange={(e) => setNewMaxMembers(e.target.value)}/>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={createRoom}
                className="flex-1 h-11 rounded-[16px] bg-gradient-to-r from-orange-400 to-amber-300 text-white font-black shadow-[0_4px_14px_rgba(255,160,50,0.3)]"
              >
                만들기
              </button>

              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewRoomName("");
                }}
                className="flex-1 h-11 rounded-[16px] bg-white border border-gray-100 text-[#c09070] font-semibold"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() =>
              setShowCreate(true)
            }
            className="w-full h-11 rounded-[16px] bg-gradient-to-r from-orange-400 to-amber-300 text-white font-black shadow-[0_4px_14px_rgba(255,160,50,0.3)]"
          >
            + 방 만들기
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
              <img
                src={room.profileImage}
                alt="프로필"
                className="w-11 h-11 rounded-full object-cover shadow"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-300 to-orange-300 text-white font-bold flex items-center justify-center shadow">
                {room.name[0]}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm truncate text-[#3d1f00]">{room.name}</span>
                {room.isSecret && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                )}
                {room.inviteOnly && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <line x1="19" y1="8" x2="19" y2="14"/>
                    <line x1="22" y1="11" x2="16" y2="11"/>
                  </svg>
                )}
              </div>
              <div className="text-xs truncate text-[#c09070]">
                멤버{" "}
                {room.members.length}{room.maxMembers ? `/${room.maxMembers}` : ""}명
              </div>
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
            <div className="text-6xl mb-4">
              💬
            </div>

            <div className="font-semibold">
              아직 채팅방이 없어요
            </div>

            <div className="text-sm mt-1">
              새 단체방을 만들어봐요
            </div>
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
          {renderRoomSettings()}
          {renderPasswordPrompt()}
        </div>
      );
    }
    return (
      <PageContainer>
        <div className="flex flex-col">
          {renderRoomList()}
          {renderInviteModal()}
          {renderRoomSettings()}
          {renderPasswordPrompt()}
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
              <div className="text-7xl mb-5">
                💬
              </div>

              <div className="text-2xl font-bold text-gray-700">
                단체 대화를 시작해봐요
              </div>

              <div className="text-gray-400 mt-2">
                왼쪽에서 채팅방을
                선택해주세요
              </div>
            </div>
          )}
        </div>
      </div>

      {renderInviteModal()}
      {renderRoomSettings()}
      {renderPasswordPrompt()}
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

const formatDateLabel = (ts: any) => {
  if (!ts) return "";

  const d = ts?.toDate
    ? ts.toDate()
    : new Date(ts);

  return d.toLocaleDateString("ko-KR");
};