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

const is369 = (n: number) => String(n).split("").some((d) => d === "3" || d === "6" || d === "9");

function FireworksOverlay({ onClose }: { onClose: () => void }) {
  const cvs = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cvs.current!;
    const ctx = c.getContext("2d")!;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const COLORS = ["#ff453a","#ff9f0a","#ffd60a","#30d158","#40c8e0","#0a84ff","#bf5af2","#ff375f","#ff6b35","#ffffff","#ff2f92","#aaff00"];
    type P = { x:number;y:number;vx:number;vy:number;color:string;life:number;size:number };
    const ps: P[] = [];
    const burst = (bx:number, by:number) => {
      const c1 = COLORS[Math.floor(Math.random()*COLORS.length)];
      const c2 = COLORS[Math.floor(Math.random()*COLORS.length)];
      const n = 50 + Math.floor(Math.random()*20);
      for (let i=0;i<n;i++) {
        const a = (i/n)*Math.PI*2 + Math.random()*0.4;
        const sp = 3 + Math.random()*6;
        ps.push({x:bx,y:by,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,color:i%2===0?c1:c2,life:70+Math.floor(Math.random()*40),size:2+Math.random()*3.5});
        ps.push({x:bx,y:by,vx:Math.cos(a)*sp*0.45,vy:Math.sin(a)*sp*0.45,color:"#ffffff",life:30+Math.floor(Math.random()*25),size:1});
      }
    };
    const POS=[[.13,.18],[.32,.12],[.52,.08],[.74,.15],[.88,.22],[.06,.42],[.5,.35],[.9,.4],[.22,.58],[.72,.52],[.12,.75],[.43,.78],[.65,.7],[.85,.78],[.5,.52],[.3,.35],[.7,.3]];
    const timers: ReturnType<typeof setTimeout>[] = [];
    POS.forEach(([px,py],i) => {
      const t1 = setTimeout(() => burst(px*c.width, py*c.height), i*140);
      const t2 = setTimeout(() => burst(px*c.width+(Math.random()-.5)*70, py*c.height+(Math.random()-.5)*70), i*140+500);
      timers.push(t1,t2);
    });
    let raf:number;
    const draw = () => {
      ctx.fillStyle="rgba(0,0,0,0.13)";
      ctx.fillRect(0,0,c.width,c.height);
      for (let i=ps.length-1;i>=0;i--) {
        const p=ps[i];
        p.x+=p.vx; p.y+=p.vy;
        p.vy+=0.07; p.vx*=0.985; p.vy*=0.985;
        p.life--;
        if(p.life<=0){ps.splice(i,1);continue;}
        ctx.globalAlpha=Math.min(1,p.life/70);
        ctx.fillStyle=p.color;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha=1;
      raf=requestAnimationFrame(draw);
    };
    raf=requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); };
  }, []);
  return (
    <div className="fixed inset-0 z-[300]" onClick={onClose}>
      <canvas ref={cvs} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none" style={{animation:"fw-pop 0.7s 0.4s ease both",opacity:0}}>
        <div style={{fontSize:88,lineHeight:1}}>🎆</div>
        <p style={{fontSize:68,fontWeight:900,color:"#fff",marginTop:14,textShadow:"0 0 40px #ffd60a,0 0 80px #ff9f0a,0 0 120px #ff453a"}}>1000!</p>
        <p style={{fontSize:20,fontWeight:800,color:"#ffd60a",marginTop:12}}>🎊 천 번 돌파! 🎊</p>
        <p style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:36}}>탭해서 닫기</p>
      </div>
      <style>{`@keyframes fw-pop{from{transform:scale(0) rotate(-12deg);opacity:0}60%{transform:scale(1.12) rotate(3deg)}to{transform:scale(1) rotate(0deg);opacity:1}}`}</style>
    </div>
  );
}

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
  type?: "text" | "image" | "audio" | "system";
  createdAt?: any;
  readBy?: string[];
  replyTo?: { id: string; from: string; content: string };
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
  const [showSpecialMenu, setShowSpecialMenu] = useState(false);
  const [wordGame, setWordGame] = useState<{ active: boolean; lastWord: string; lastChar: string; lastPlayer: string; startedBy: string } | null>(null);
  const [showFortune, setShowFortune] = useState(false);
  const [fortuneIdx, setFortuneIdx] = useState(0);
  const [fortuneSpinning, setFortuneSpinning] = useState(false);
  const [selectedFortune, setSelectedFortune] = useState<typeof FORTUNES[0] | null>(null);
  const fortuneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [chosungGame, setChosungGame] = useState<{ active: boolean; consonants: string; answer: string; startedBy: string; solved: boolean; solvedBy?: string } | null>(null);
  const [showChosungSetup, setShowChosungSetup] = useState(false);
  const [chosungConsonants, setChosungConsonants] = useState("");
  const [chosungAnswer, setChosungAnswer] = useState("");
  const [game369, setGame369] = useState<{ active: boolean; currentNumber: number; lastPlayer: string; startedBy: string } | null>(null);
  const [showFireworks, setShowFireworks] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newIsSecret, setNewIsSecret] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newMaxMembers, setNewMaxMembers] = useState("");
  const [newInviteOnly, setNewInviteOnly] = useState(false);

  const [editingRoomName, setEditingRoomName] = useState(false);
  const [newRoomNameEdit, setNewRoomNameEdit] = useState("");
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

  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [sendingImage, setSendingImage] = useState(false);

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);


  const profileInputRef =
    useRef<HTMLInputElement>(null);
  const msgInputRef = useRef<HTMLInputElement>(null);

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

  // 타이핑 구독
  useEffect(() => {
    if (!currentRoom || !nickname) return;
    const unsub = onSnapshot(doc(db, "group_typing", currentRoom.id), (snap) => {
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

  const sendTyping = async (isTyping: boolean) => {
    if (!currentRoom || !nickname) return;
    try {
      await setDoc(doc(db, "group_typing", currentRoom.id), {
        [nickname]: { isTyping, nickname, updatedAt: Date.now() },
      }, { merge: true });
    } catch { /* 타이핑 표시 실패는 무시 */ }
  };

  // 끝말잇기 게임 상태 구독
  useEffect(() => {
    if (!currentRoom) { setWordGame(null); return; }
    const unsub = onSnapshot(doc(db, "wordgame_group", currentRoom.id), (snap) => {
      if (!snap.exists()) { setWordGame(null); return; }
      setWordGame(snap.data() as any);
    }, () => setWordGame(null));
    return () => unsub();
  }, [currentRoom?.id]);

  useEffect(() => {
    if (!currentRoom) { setChosungGame(null); return; }
    return onSnapshot(doc(db, "chosunggame_group", currentRoom.id), (snap) => {
      setChosungGame(snap.exists() ? snap.data() as any : null);
    }, () => setChosungGame(null));
  }, [currentRoom?.id]);

  useEffect(() => {
    if (!currentRoom) { setGame369(null); return; }
    return onSnapshot(doc(db, "game369_group", currentRoom.id), (snap) => {
      const data = snap.exists() ? snap.data() as any : null;
      setGame369(data);
      if (data?.currentNumber === 1000) setShowFireworks(true);
    }, () => setGame369(null));
  }, [currentRoom?.id]);

  useEffect(() => {
    if (!showFireworks) return;
    const t = setTimeout(() => setShowFireworks(false), 8000);
    return () => clearTimeout(t);
  }, [showFireworks]);

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
    if (!currentRoom || !nickname) return;
    setShowSpecialMenu(false);
    await setDoc(doc(db, "wordgame_group", currentRoom.id), {
      active: true, lastWord: "", lastChar: "", lastPlayer: "", startedBy: nickname,
    });
    await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), {
      from: "__system__", content: `🎮 ${nickname}님이 끝말잇기를 시작했어요! 먼저 단어를 입력하세요.`,
      type: "system", createdAt: serverTimestamp(),
    });
  };

  const endWordGame = async (reason?: string) => {
    if (!currentRoom || !nickname) return;
    await setDoc(doc(db, "wordgame_group", currentRoom.id), {
      active: false, lastWord: "", lastChar: "", lastPlayer: "", startedBy: "",
    });
    if (reason) {
      await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), {
        from: "__system__", content: reason, type: "system", createdAt: serverTimestamp(),
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

  const openChosungSetup = () => { setShowSpecialMenu(false); setShowChosungSetup(true); };
  const submitChosung = async () => {
    if (!chosungConsonants.trim() || !chosungAnswer.trim() || !currentRoom || !nickname) return;
    setShowChosungSetup(false);
    await setDoc(doc(db, "chosunggame_group", currentRoom.id), {
      active: true, consonants: chosungConsonants.trim(), answer: chosungAnswer.trim(), startedBy: nickname, solved: false,
    });
    await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), {
      from: "__system__", content: `❓ ${nickname}님의 초성 퀴즈! 힌트: 【 ${chosungConsonants.trim()} 】 무슨 단어일까요?`,
      type: "system", createdAt: serverTimestamp(),
    });
    setChosungConsonants(""); setChosungAnswer("");
  };
  const endChosungGame = async (msg?: string) => {
    if (!currentRoom || !nickname) return;
    await setDoc(doc(db, "chosunggame_group", currentRoom.id), { active: false, consonants: "", answer: "", startedBy: "", solved: false });
    if (msg) await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), { from: "__system__", content: msg, type: "system", createdAt: serverTimestamp() });
  };

  const start369 = async () => {
    if (!currentRoom || !nickname) return;
    setShowSpecialMenu(false);
    await setDoc(doc(db, "game369_group", currentRoom.id), { active: true, currentNumber: 0, lastPlayer: "", startedBy: nickname });
    await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), {
      from: "__system__", content: `🔢 ${nickname}님이 369 게임을 시작했어요! 1부터 차례로 세고 3·6·9가 들어간 숫자는 👏로 치세요.`,
      type: "system", createdAt: serverTimestamp(),
    });
  };
  const end369 = async (msg: string) => {
    if (!currentRoom || !nickname) return;
    await setDoc(doc(db, "game369_group", currentRoom.id), { active: false, currentNumber: 0, lastPlayer: "", startedBy: "" });
    await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), { from: "__system__", content: msg, type: "system", createdAt: serverTimestamp() });
  };
  const sendClap = async () => {
    if (!game369?.active || !currentRoom || !nickname) return;
    const expected = game369.currentNumber + 1;
    const claps = String(expected).split("").filter(d => "369".includes(d)).length || 1;
    await setDoc(doc(db, "game369_group", currentRoom.id), { active: true, currentNumber: expected, lastPlayer: nickname, startedBy: game369.startedBy });
    await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), { from: nickname, content: "👏".repeat(claps), type: "text", createdAt: serverTimestamp() });
  };

  const drawLots = async () => {
    if (!currentRoom || !nickname) return;
    setShowSpecialMenu(false);
    const winner = currentRoom.members[Math.floor(Math.random() * currentRoom.members.length)];
    await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), {
      from: "__system__", content: `🎰 제비뽑기 결과: 🎉 ${winner}님이 당첨됐어요!`,
      type: "system", createdAt: serverTimestamp(),
    });
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
            (u) => u.nickname !== nickname && u.nickname !== "Stella" && u.nickname !== "관리자"
          );

        list.sort((a, b) => (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko"));
        setAllUsers(list);
      }
    );
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

  const saveRoomName = async () => {
    if (!currentRoom || !newRoomNameEdit.trim()) return;
    await updateDoc(doc(db, "group_rooms", currentRoom.id), { name: newRoomNameEdit.trim() });
    setEditingRoomName(false);
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
            await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), {
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

  const sendMessage = async (textOverride?: string) => {
    const rawInput = textOverride ?? input;
    if (!rawInput.trim() || !nickname || !currentRoom) return;

    const text = rawInput.trim();

    // 초성 퀴즈 정답 체크
    if (chosungGame?.active && !chosungGame.solved && currentRoom) {
      if (text === chosungGame.answer.trim()) {
        await setDoc(doc(db, "chosunggame_group", currentRoom.id), {
          active: true, consonants: chosungGame.consonants, answer: chosungGame.answer,
          startedBy: chosungGame.startedBy, solved: true, solvedBy: nickname,
        });
        await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), {
          from: "__system__", content: `🎉 정답! ${nickname}님이 맞췄어요! 정답은 「${chosungGame.answer}」`,
          type: "system", createdAt: serverTimestamp(),
        });
        setInput(""); return;
      }
    }

    // 369 검증
    if (game369?.active && currentRoom) {
      const expected = game369.currentNumber + 1;
      const requiredClaps = String(expected).split("").filter(d => "369".includes(d)).length;
      const isClap = requiredClaps > 0 && (text === "👏".repeat(requiredClaps) || text === "박수" || text === "짝".repeat(requiredClaps));
      if (is369(expected)) {
        if (!isClap) {
          setInput("");
          await end369(`❌ ${expected}에서 ${"👏".repeat(requiredClaps)}를 쳐야 했는데 ${nickname}님이 틀렸어요! 게임 종료.`);
          return;
        }
      } else {
        if (text !== String(expected)) {
          setInput("");
          await end369(`❌ ${expected}가 정답이었는데 ${nickname}님이 틀렸어요! 게임 종료.`);
          return;
        }
      }
      await setDoc(doc(db, "game369_group", currentRoom.id), {
        active: true, currentNumber: expected, lastPlayer: nickname, startedBy: game369.startedBy,
      });
    }

    // 끝말잇기 검증
    if (wordGame?.active) {
      if (wordGame.lastChar && text.charAt(0) !== wordGame.lastChar) {
        setInput("");
        await endWordGame(`❌ '${wordGame.lastChar}'(으)로 시작해야 하는데 '${text}'를 입력했어요. ${nickname}님 탈락! 게임 종료.`);
        return;
      }
      const newLastChar = text.charAt(text.length - 1);
      await setDoc(doc(db, "wordgame_group", currentRoom.id), {
        active: true, lastWord: text, lastChar: newLastChar,
        lastPlayer: nickname, startedBy: wordGame.startedBy || nickname,
      });
    }

    await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), {
      from: nickname,
      content: text,
      type: "text",
      createdAt: serverTimestamp(),
      readBy: [nickname],
      ...(replyTo ? { replyTo: { id: replyTo.id, from: replyTo.from, content: replyTo.content } } : {}),
    });
    setReplyTo(null);

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
  const deleteGroupMsg = async (msgId: string) => {
    if (!currentRoom) return;
    await deleteDoc(doc(db, "group_rooms", currentRoom.id, "messages", msgId));
    setCtxMenu(null);
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
    const base64 = await compressToBase64(file);
    await addDoc(collection(db, "group_rooms", currentRoom.id, "messages"), {
      from: nickname,
      content: base64,
      type: "image",
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
          message: "📷 사진을 보냈어요",
          roomName: currentRoom.name,
          url: `/groupchat?room=${currentRoom.id}`,
        }),
      }).catch(() => {});
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
        roomType: "group",
        status: "pending",
        createdAt: serverTimestamp(),
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
          className="w-80 bg-white rounded-3xl p-5"
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
                <div className="w-11 h-11 rounded-full bg- text-white font-bold flex items-center justify-center shadow">
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
              <button onClick={() => setSettingSecret(!settingSecret)} className={`relative w-12 h-6 rounded-full transition-colors ${settingSecret ? "bg-sky-500" : "bg-gray-200"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settingSecret ? "translate-x-[24px]" : "translate-x-0"}`}/>
              </button>
            </div>
            {settingSecret && (
              <input className="w-full h-11 rounded-xl bg-gray-50 px-4 text-sm outline-none text-slate-800 placeholder:text-slate-400"
                placeholder="비밀번호 입력" value={settingPassword} onChange={(e) => setSettingPassword(e.target.value)}/>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                <span className="font-bold text-sm text-gray-700">초대 전용 (방장만 초대)</span>
              </div>
              <button onClick={() => setSettingInviteOnly(!settingInviteOnly)} className={`relative w-12 h-6 rounded-full transition-colors ${settingInviteOnly ? "bg-sky-300" : "bg-gray-200"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settingInviteOnly ? "translate-x-[24px]" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <input className="flex-1 h-11 rounded-xl bg-gray-50 px-4 text-sm outline-none text-slate-800 placeholder:text-slate-400"
                placeholder="최대 인원 (빈칸=무제한)" type="number" min="2" value={settingMaxMembers} onChange={(e) => setSettingMaxMembers(e.target.value)}/>
            </div>
          </div>
          <button onClick={saveRoomSettings}
            className="w-full h-12 rounded-2xl bg-sky-200 text-white font-black active:scale-95 transition-transform">
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
        <div className="w-80 bg-white rounded-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span className="font-black text-gray-800">비밀방 비밀번호</span>
          </div>
          <input className="w-full h-11 rounded-xl bg-gray-50 px-4 text-sm outline-none text-slate-800 placeholder:text-slate-400"
            placeholder="비밀번호 입력" type="password" value={enteredPassword}
            onChange={(e) => setEnteredPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && inviteUser(pendingInviteTarget, enteredPassword)}
            autoFocus/>
          <button onClick={() => inviteUser(pendingInviteTarget, enteredPassword)}
            className="w-full h-12 rounded-2xl bg-sky-200 text-white font-black active:scale-95 transition-transform">
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
      <div className="px-4 py-3 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentRoom(null)} className="text-gray-500 text-lg px-1">←</button>

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
              <div className="w-11 h-11 rounded-full bg- text-white font-bold flex items-center justify-center shadow">
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

      {/* 멤버 */}
      <div className="px-4 py-2 bg-white/60">
        <div className="text-xs text-sky-600 truncate font-semibold">
          👥{" "}
          {currentRoom?.members.join(", ")}
        </div>
      </div>

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

      {chosungGame?.active && !chosungGame.solved && (
        <div className="flex items-center justify-between px-4 py-2 bg-purple-50 border-b border-purple-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-purple-700">❓ 초성 퀴즈</span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-200 text-purple-700 text-xs font-black tracking-widest">【 {chosungGame.consonants} 】</span>
          </div>
          <button onClick={() => endChosungGame(`❌ 초성 퀴즈 종료. 정답은 「${chosungGame.answer}」였어요.`)} className="text-[10px] text-slate-400 font-bold px-2">종료</button>
        </div>
      )}

      {game369?.active && (
        <div className="flex items-center justify-between px-4 py-2 bg-orange-50 border-b border-orange-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-orange-700">🔢 369 게임</span>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-200 text-orange-700 text-xs font-black">
              다음: {game369.currentNumber + 1}{is369(game369.currentNumber + 1) ? " → 👏" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={sendClap}
              className="px-3 py-1 rounded-xl bg-orange-400 text-white text-sm font-black active:scale-90 transition">
              👏 박수
            </button>
            <button onClick={() => end369("🏳️ 369 게임이 종료됐어요.")} className="text-[10px] text-slate-400 font-bold px-2">종료</button>
          </div>
        </div>
      )}

      {/* 메시지 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 flex flex-col gap-3">
        {messages.map((m, i) => {
          if (m.type === "system") return (
            <div key={m.id} className="flex justify-center my-1">
              <div className="bg-sky-50 border border-sky-100 text-sky-600 text-xs font-bold px-4 py-2 rounded-full">
                {m.content}
              </div>
            </div>
          );

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
                      </div>
                    )}

                  <div
                    className={`px-4 py-3 rounded-3xl text-sm ${
                      isMine
                        ? "bg-sky-200 text-white rounded-br-md"
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
                        onClick={() => window.open(m.content, "_blank")}
                      />
                    ) : m.type === "audio" ? (
                      <audio src={m.content} controls className="max-w-[220px] rounded-xl" />
                    ) : (
                      <span className="break-words whitespace-pre-wrap">
                        {renderHighlighted(m.content)}
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

        <div ref={messagesEndRef} />
      </div>

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
          placeholder={wordGame?.active && wordGame.lastChar ? `'${wordGame.lastChar}'(으)로 시작하는 단어` : "메시지 입력"}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (e.target.value.trim()) setShowSpecialMenu(false);
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
            if (e.key === "Enter" && !e.shiftKey) { sendMessage(); setShowSpecialMenu(false); }
          }}
        />

        <div className="relative shrink-0">
          {showSpecialMenu && (
            <div className="absolute bottom-[56px] left-[-240px] right-0 z-50 animate-[fadeInUp_0.15s_ease]">
              <div className="bg-white rounded-[20px] shadow-xl border border-gray-100 p-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "끝말잇기", onClick: startWordGame, color: "text-sky-600 border-sky-100 bg-sky-50" },
                    { label: "오늘의 운세", onClick: openFortune, color: "text-purple-600 border-purple-100 bg-purple-50" },
                    { label: "초성 퀴즈", onClick: openChosungSetup, color: "text-violet-600 border-violet-100 bg-violet-50" },
                    { label: "369 게임", onClick: start369, color: "text-orange-600 border-orange-100 bg-orange-50" },
                  ].map(({ label, onClick, color }) => (
                    <button key={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
                      className={`flex items-center justify-center px-3 py-2.5 rounded-[14px] border text-xs font-black whitespace-nowrap active:scale-95 transition ${color}`}>
                      {label}
                    </button>
                  ))}
                  <button onMouseDown={(e) => e.preventDefault()} onClick={drawLots}
                    className="col-span-2 flex items-center justify-center px-3 py-2.5 rounded-[14px] border text-xs font-black bg-yellow-50 border-yellow-100 text-yellow-600 active:scale-95 transition">
                    🎰 제비뽑기
                  </button>
                </div>
              </div>
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
    </div>
  );

  // 방 목록
  const renderRoomList = () => (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black bg-yellow-200">
            WAGIE GROUP
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

      <div className="px-3 py-3">
        {showCreate ? (
          <div className="flex flex-col gap-2">
            <input
              className="w-full h-11 rounded-[16px] bg-white border border-sky-200 px-4 text-sm outline-none text-slate-800 placeholder:text-slate-400"
              placeholder="방 이름 입력"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createRoom()}
              autoFocus
            />

            {/* 조건 설정 */}
            <div className="bg-white rounded-[14px] px-3 py-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span className="text-xs font-bold text-gray-600">비밀방</span>
                </div>
                <button onClick={() => setNewIsSecret(!newIsSecret)} className={`relative w-10 h-5 rounded-full transition-colors ${newIsSecret ? "bg-sky-500" : "bg-gray-200"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${newIsSecret ? "translate-x-5" : "translate-x-0"}`}/>
                </button>
              </div>
              {newIsSecret && (
                <input className="w-full h-9 rounded-xl bg-gray-50 px-3 text-xs outline-none text-slate-800 placeholder:text-slate-400"
                  placeholder="비밀번호 입력" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}/>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                  </svg>
                  <span className="text-xs font-bold text-gray-600">초대 전용</span>
                </div>
                <button onClick={() => setNewInviteOnly(!newInviteOnly)} className={`relative w-10 h-5 rounded-full transition-colors ${newInviteOnly ? "bg-sky-300" : "bg-gray-200"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${newInviteOnly ? "translate-x-5" : "translate-x-0"}`}/>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <input className="flex-1 h-8 rounded-xl bg-gray-50 px-3 text-xs outline-none text-slate-800 placeholder:text-slate-400"
                  placeholder="최대 인원 (빈칸=무제한)" type="number" min="2" value={newMaxMembers} onChange={(e) => setNewMaxMembers(e.target.value)}/>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={createRoom}
                className="flex-1 h-11 rounded-[16px] bg-sky-200 text-white font-black"
              >
                만들기
              </button>

              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewRoomName("");
                }}
                className="flex-1 h-11 rounded-[16px] bg-white text-sky-600 font-semibold"
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
            className="w-full h-11 rounded-[16px] bg-sky-200 text-white font-black"
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
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-[18px] mb-2 border transition text-left ${
              currentRoom?.id === room.id
                ? "bg-sky-200"
                : "bg-white/80 hover:bg-sky-50 border-sky-200"
            }`}
          >
            {room.profileImage ? (
              <img
                src={room.profileImage}
                alt="프로필"
                className="w-11 h-11 rounded-full object-cover shadow"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg- text-white font-bold flex items-center justify-center shadow">
                {room.name[0]}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm truncate text-slate-800">{room.name}</span>
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
              <div className="text-xs truncate text-sky-600">
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

  if (currentRoom) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-gray-50">
        {renderRoom()}
        {renderInviteModal()}
        {renderRoomSettings()}
        {renderPasswordPrompt()}
        {showChosungSetup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => setShowChosungSetup(false)}>
            <div className="mx-6 w-full max-w-sm bg-white rounded-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <p className="font-black text-slate-800 text-lg">❓ 초성 퀴즈 만들기</p>
              <div>
                <p className="text-xs font-bold text-gray-400 mb-1.5">초성 힌트 (모두에게 보여요)</p>
                <input value={chosungConsonants} onChange={(e) => setChosungConsonants(e.target.value)}
                  placeholder="예: ㅅㄹ" autoFocus
                  className="w-full h-11 rounded-2xl bg-gray-50 border border-gray-200 px-4 text-lg font-black tracking-[0.3em] text-center outline-none focus:ring-2 focus:ring-violet-200"/>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 mb-1.5">정답 (나만 알고 있어요)</p>
                <input value={chosungAnswer} onChange={(e) => setChosungAnswer(e.target.value)}
                  placeholder="예: 사랑" onKeyDown={(e) => e.key === "Enter" && submitChosung()}
                  className="w-full h-11 rounded-2xl bg-gray-50 border border-gray-200 px-4 text-sm outline-none focus:ring-2 focus:ring-violet-200"/>
              </div>
              <button onClick={submitChosung} disabled={!chosungConsonants.trim() || !chosungAnswer.trim()}
                className="w-full h-12 rounded-2xl bg-violet-400 text-white font-black disabled:opacity-40 active:scale-95 transition">
                퀴즈 시작!
              </button>
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
        {showFireworks && <FireworksOverlay onClose={() => setShowFireworks(false)} />}
        {ctxMenu && (
          <div className="fixed inset-0 z-[200]" onClick={() => setCtxMenu(null)}>
            <div className="fixed bg-white rounded-3xl shadow-2xl overflow-hidden w-44" style={{ top: ctxMenu.y, left: ctxMenu.x }} onClick={(e) => e.stopPropagation()}>
              <button className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm" onClick={() => { setReplyTo({ id: ctxMenu.msgId, from: ctxMenu.msg.from, content: ctxMenu.msg.content, type: ctxMenu.msg.type }); setCtxMenu(null); }}>↩ 답장</button>
              {ctxMenu.isMine && (
                <button className="w-full px-4 py-3 text-left hover:bg-red-50 text-red-500 text-sm" onClick={() => deleteGroupMsg(ctxMenu.msgId)}>🗑️ 삭제</button>
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
        {renderRoomSettings()}
        {renderPasswordPrompt()}
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