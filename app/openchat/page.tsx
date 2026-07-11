"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import DrawingCanvas from "@/components/DrawingCanvas";
import { db, auth } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, doc, getDoc, updateDoc, limit, deleteDoc, setDoc,
} from "firebase/firestore";

const TOPICS = ["전체", "게임", "공부", "음악", "영화", "운동", "음식", "여행", "일상", "기타"];

const TOPIC_COLORS: Record<string, string> = {
  게임: "bg-purple-100 text-purple-600",
  공부: "bg-blue-100 text-blue-600",
  음악: "bg-pink-100 text-pink-600",
  영화: "bg-red-100 text-red-600",
  운동: "bg-green-100 text-green-600",
  음식: "bg-orange-100 text-orange-600",
  여행: "bg-teal-100 text-teal-600",
  일상: "bg-gray-100 text-gray-600",
  기타: "bg-slate-100 text-slate-500",
};

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

const is369 = (n: number) => String(n).split("").some((d) => d === "3" || d === "6" || d === "9");

function FireworksOverlay({ onClose }: { onClose: () => void }) {
  const cvs = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cvs.current!;
    const ctx = c.getContext("2d")!;
    c.width = window.innerWidth; c.height = window.innerHeight;
    const COLORS = ["#ff453a","#ff9f0a","#ffd60a","#30d158","#40c8e0","#0a84ff","#bf5af2","#ff375f","#ff6b35","#ffffff","#ff2f92","#aaff00"];
    type P = { x:number;y:number;vx:number;vy:number;color:string;life:number;size:number };
    const ps: P[] = [];
    const burst = (bx:number, by:number) => {
      const c1 = COLORS[Math.floor(Math.random()*COLORS.length)], c2 = COLORS[Math.floor(Math.random()*COLORS.length)];
      const n = 50 + Math.floor(Math.random()*20);
      for (let i=0;i<n;i++) {
        const a=(i/n)*Math.PI*2+Math.random()*0.4, sp=3+Math.random()*6;
        ps.push({x:bx,y:by,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,color:i%2===0?c1:c2,life:70+Math.floor(Math.random()*40),size:2+Math.random()*3.5});
        ps.push({x:bx,y:by,vx:Math.cos(a)*sp*0.45,vy:Math.sin(a)*sp*0.45,color:"#ffffff",life:30+Math.floor(Math.random()*25),size:1});
      }
    };
    const POS=[[.13,.18],[.32,.12],[.52,.08],[.74,.15],[.88,.22],[.06,.42],[.5,.35],[.9,.4],[.22,.58],[.72,.52],[.12,.75],[.43,.78],[.65,.7],[.85,.78],[.5,.52],[.3,.35],[.7,.3]];
    const timers: ReturnType<typeof setTimeout>[] = [];
    POS.forEach(([px,py],i) => { const t1=setTimeout(()=>burst(px*c.width,py*c.height),i*140); const t2=setTimeout(()=>burst(px*c.width+(Math.random()-.5)*70,py*c.height+(Math.random()-.5)*70),i*140+500); timers.push(t1,t2); });
    let raf:number;
    const draw = () => {
      ctx.fillStyle="rgba(0,0,0,0.13)"; ctx.fillRect(0,0,c.width,c.height);
      for (let i=ps.length-1;i>=0;i--) { const p=ps[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.07; p.vx*=0.985; p.vy*=0.985; p.life--; if(p.life<=0){ps.splice(i,1);continue;} ctx.globalAlpha=Math.min(1,p.life/70); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); }
      ctx.globalAlpha=1; raf=requestAnimationFrame(draw);
    };
    raf=requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); };
  }, []);
  return (
    <div className="fixed inset-0 z-[300]" onClick={onClose}>
      <canvas ref={cvs} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none" style={{animation:"fw-pop 0.7s 0.4s ease both",opacity:0}}>
        <div style={{fontSize:88,lineHeight:1}}>🎆</div>
        <p style={{fontSize:68,fontWeight:900,color:"#fff",marginTop:14,textShadow:"0 0 40px #ffd60a,0 0 80px #ff9f0a"}}>1000!</p>
        <p style={{fontSize:20,fontWeight:800,color:"#ffd60a",marginTop:12}}>🎊 천 번 돌파! 🎊</p>
      </div>
      <style>{`@keyframes fw-pop{from{transform:scale(0) rotate(-12deg);opacity:0}60%{transform:scale(1.12) rotate(3deg)}to{transform:scale(1) rotate(0deg);opacity:1}}`}</style>
    </div>
  );
}

type Room = { id: string; name: string; topic: string; createdBy: string; lastMessage?: string; lastAt?: any; };
type ReplyTo = { id: string; from: string; content: string; type?: string };
type Message = { id: string; from: string; content: string; createdAt: any; type?: "text" | "image" | "audio" | "system"; replyTo?: ReplyTo; };

const formatTime = (ts: any) => { if (!ts?.toDate) return ""; return ts.toDate().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }); };

const compressToBase64 = (file: File, maxPx = 800): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { const ratio = Math.min(maxPx/img.width, maxPx/img.height, 1); const canvas = document.createElement("canvas"); canvas.width=img.width*ratio; canvas.height=img.height*ratio; canvas.getContext("2d")?.drawImage(img,0,0,canvas.width,canvas.height); URL.revokeObjectURL(url); resolve(canvas.toDataURL("image/jpeg",0.8)); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("이미지 로드 실패")); };
    img.src = url;
  });

const THEMES = [
  { id: "sky",    blob1: "#bae6fd", blob2: "#e0f2fe", blob3: "#dbeafe", bg: "#f0f9ff" },
  { id: "violet", blob1: "#ddd6fe", blob2: "#ede9fe", blob3: "#fae8ff", bg: "#faf5ff" },
  { id: "pink",   blob1: "#fbcfe8", blob2: "#fce7f3", blob3: "#fdf2f8", bg: "#fdf2f8" },
  { id: "mint",   blob1: "#a7f3d0", blob2: "#d1fae5", blob3: "#ecfdf5", bg: "#f0fdf4" },
  { id: "peach",  blob1: "#fed7aa", blob2: "#ffedd5", blob3: "#fff7ed", bg: "#fff7ed" },
];
const ACCENT: Record<string, { from: string; to: string; shadow: string; ring: string }> = {
  sky:    { from: "#38bdf8", to: "#6366f1", shadow: "rgba(56,189,248,0.35)",  ring: "#bae6fd" },
  violet: { from: "#a78bfa", to: "#ec4899", shadow: "rgba(167,139,250,0.35)", ring: "#ddd6fe" },
  pink:   { from: "#f472b6", to: "#fb923c", shadow: "rgba(244,114,182,0.35)", ring: "#fbcfe8" },
  mint:   { from: "#34d399", to: "#06b6d4", shadow: "rgba(52,211,153,0.35)",  ring: "#a7f3d0" },
  peach:  { from: "#fb923c", to: "#f43f5e", shadow: "rgba(251,146,60,0.35)",  ring: "#fed7aa" },
};

export default function OpenChatPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("전체");
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomTopic, setNewRoomTopic] = useState("일상");

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState("sky");
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ msgId: string; x: number; y: number; isMine: boolean; msg: Message } | null>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showSpecialMenu, setShowSpecialMenu] = useState(false);
  const [showDrawCanvas, setShowDrawCanvas] = useState(false);

  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [sendingImage, setSendingImage] = useState(false);
  const [pendingAudio, setPendingAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [sendingAudio, setSendingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isDictating, setIsDictating] = useState(false);

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

  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const longPressTimer = useRef<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      setNickname(snap.exists() ? snap.data().nickname : user.displayName || "유저");
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "openRooms"), orderBy("lastAt", "desc"));
    return onSnapshot(q, (snap) => { setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Room))); });
  }, []);

  useEffect(() => {
    if (!currentRoom) return;
    const q = query(collection(db, "openRooms", currentRoom.id, "messages"), orderBy("createdAt", "asc"), limit(100));
    return onSnapshot(q, (snap) => { setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message))); });
  }, [currentRoom]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const globalTheme = localStorage.getItem("globalChatTheme") || "sky";
    if (!currentRoom?.id) { setActiveTheme(globalTheme); return; }
    const saved = localStorage.getItem(`chatTheme_open_${currentRoom.id}`);
    setActiveTheme(THEMES.find(t => t.id === saved) ? saved! : globalTheme);
  }, [currentRoom?.id]);

  useEffect(() => {
    if (!currentRoom) { setWordGame(null); return; }
    return onSnapshot(doc(db, "wordgame_open", currentRoom.id), (snap) => {
      setWordGame(snap.exists() ? snap.data() as any : null);
    }, () => setWordGame(null));
  }, [currentRoom?.id]);

  useEffect(() => {
    if (!currentRoom) { setChosungGame(null); return; }
    return onSnapshot(doc(db, "chosunggame_open", currentRoom.id), (snap) => {
      setChosungGame(snap.exists() ? snap.data() as any : null);
    }, () => setChosungGame(null));
  }, [currentRoom?.id]);

  useEffect(() => {
    if (!currentRoom) { setGame369(null); return; }
    return onSnapshot(doc(db, "game369_open", currentRoom.id), (snap) => {
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

  const createRoom = async () => {
    if (!newRoomName.trim() || !nickname) return;
    const ref = await addDoc(collection(db, "openRooms"), { name: newRoomName.trim(), topic: newRoomTopic, createdBy: nickname, lastMessage: "", lastAt: serverTimestamp() });
    setNewRoomName(""); setShowCreate(false);
    const snap = await getDoc(ref);
    setCurrentRoom({ id: ref.id, ...snap.data() } as Room);
  };

  const sysMsg = async (content: string) => {
    if (!currentRoom) return;
    await addDoc(collection(db, "openRooms", currentRoom.id, "messages"), { from: "__system__", content, type: "system", createdAt: serverTimestamp() });
  };

  const sendMessage = async (textOverride?: string) => {
    const rawInput = textOverride ?? input;
    if (!rawInput.trim() || !currentRoom || !nickname || isSending) return;
    const text = rawInput.trim();

    if (chosungGame?.active && !chosungGame.solved && currentRoom) {
      if (text === chosungGame.answer.trim()) {
        await setDoc(doc(db, "chosunggame_open", currentRoom.id), { ...chosungGame, solved: true, solvedBy: nickname });
        await sysMsg(`🎉 정답! ${nickname}님이 맞췄어요! 정답은 「${chosungGame.answer}」`);
        setInput(""); return;
      }
    }

    if (game369?.active && currentRoom) {
      const expected = game369.currentNumber + 1;
      const requiredClaps = String(expected).split("").filter(d => "369".includes(d)).length;
      const isClap = requiredClaps > 0 && (text === "👏".repeat(requiredClaps) || text === "박수" || text === "짝".repeat(requiredClaps));
      if (is369(expected)) {
        if (!isClap) { setInput(""); await end369(`❌ ${expected}에서 ${"👏".repeat(requiredClaps)}를 쳐야 했는데 ${nickname}님이 틀렸어요! 게임 종료.`); return; }
      } else {
        if (text !== String(expected)) { setInput(""); await end369(`❌ ${expected}가 정답이었는데 ${nickname}님이 틀렸어요! 게임 종료.`); return; }
      }
      await setDoc(doc(db, "game369_open", currentRoom.id), { active: true, currentNumber: expected, lastPlayer: nickname, startedBy: game369.startedBy });
    }

    if (wordGame?.active) {
      if (wordGame.lastChar && text.charAt(0) !== wordGame.lastChar) {
        setInput(""); await endWordGame(`❌ '${wordGame.lastChar}'(으)로 시작해야 하는데 '${text}'를 입력했어요. ${nickname}님 탈락! 게임 종료.`); return;
      }
      const newLastChar = text.charAt(text.length - 1);
      await setDoc(doc(db, "wordgame_open", currentRoom.id), { active: true, lastWord: text, lastChar: newLastChar, lastPlayer: nickname, startedBy: wordGame.startedBy || nickname });
    }

    setIsSending(true);
    const text2 = input.trim() || textOverride?.trim() || "";
    if (!textOverride) setInput("");
    try {
      await addDoc(collection(db, "openRooms", currentRoom.id, "messages"), {
        from: nickname, content: text, type: "text", createdAt: serverTimestamp(),
        ...(replyTo ? { replyTo: { id: replyTo.id, from: replyTo.from, content: replyTo.content, type: replyTo.type } } : {}),
      });
      setReplyTo(null);
    } catch { alert("메시지 전송에 실패했어요. 다시 시도해줘!"); setIsSending(false); return; }
    try { await updateDoc(doc(db, "openRooms", currentRoom.id), { lastMessage: text, lastAt: serverTimestamp() }); } catch {}
    finally { setIsSending(false); }
  };

  const sendImage = async (file: File) => {
    if (!nickname || !currentRoom) return;
    setSendingImage(true);
    try {
      const base64 = await compressToBase64(file);
      await addDoc(collection(db, "openRooms", currentRoom.id, "messages"), { from: nickname, content: base64, type: "image", createdAt: serverTimestamp() });
      await updateDoc(doc(db, "openRooms", currentRoom.id), { lastMessage: "📷 사진", lastAt: serverTimestamp() });
    } catch { alert("이미지 전송에 실패했어요."); }
    finally { setPendingImage(null); setSendingImage(false); }
  };

  const cancelPendingImage = () => { if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl); setPendingImage(null); };

  const sendDrawing = async (dataUrl: string) => {
    setShowDrawCanvas(false);
    if (!nickname || !currentRoom) return;
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], "drawing.png", { type: "image/png" });
    await sendImage(file);
  };

  const toggleRecording = async () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); if (recordTimerRef.current) clearTimeout(recordTimerRef.current); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); const blob = new Blob(audioChunksRef.current, { type: mimeType }); setPendingAudio({ blob, url: URL.createObjectURL(blob) }); setIsRecording(false); };
      mr.start(); mediaRecorderRef.current = mr; setIsRecording(true);
      recordTimerRef.current = setTimeout(() => mr.stop(), 30000);
    } catch { alert("마이크 권한이 필요해요."); }
  };

  const cancelAudio = () => { if (pendingAudio) URL.revokeObjectURL(pendingAudio.url); setPendingAudio(null); };

  const sendAudio = async () => {
    if (!pendingAudio || sendingAudio || !nickname || !currentRoom) return;
    setSendingAudio(true);
    try {
      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader(); reader.readAsDataURL(pendingAudio.blob);
        reader.onloadend = async () => {
          try {
            await addDoc(collection(db, "openRooms", currentRoom.id, "messages"), { from: nickname, content: reader.result as string, type: "audio", createdAt: serverTimestamp() });
            await updateDoc(doc(db, "openRooms", currentRoom.id), { lastMessage: "🎵 음성", lastAt: serverTimestamp() });
            URL.revokeObjectURL(pendingAudio.url); setPendingAudio(null); resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = reject;
      });
    } catch { alert("전송 실패. 다시 시도해주세요."); }
    finally { setSendingAudio(false); }
  };

  const startDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("이 브라우저는 받아쓰기를 지원하지 않아요. Chrome을 사용해주세요."); return; }
    if (isDictating) { recognitionRef.current?.stop(); return; }
    let finalText = "";
    const recognition = new SR(); recognition.lang = "ko-KR"; recognition.interimResults = true; recognition.continuous = true;
    recognition.onstart = () => setIsDictating(true);
    recognition.onend = () => setIsDictating(false);
    recognition.onerror = (e: any) => { setIsDictating(false); if (e.error === "not-allowed") alert("마이크 권한이 없어요."); else if (e.error !== "aborted" && e.error !== "no-speech") alert(`받아쓰기 오류: ${e.error}`); };
    recognition.onresult = (e: any) => { let interim = ""; for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) finalText += e.results[i][0].transcript; else interim += e.results[i][0].transcript; } setInput(finalText + interim); };
    recognition.start(); recognitionRef.current = recognition; setShowPlusMenu(false);
  };

  const openCtxMenu = (e: React.MouseEvent | React.TouchEvent, m: Message, isMine: boolean) => {
    let x = 0, y = 0;
    if ("touches" in e) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
    else { e.preventDefault(); x = e.clientX; y = e.clientY; }
    const menuW = 160, menuH = isMine ? 100 : 56;
    if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 8;
    if (x < 8) x = 8;
    if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8;
    if (y < 8) y = 8;
    setCtxMenu({ msgId: m.id, x, y, isMine, msg: m });
  };
  const handleTouchStart = (e: React.TouchEvent, m: Message, isMine: boolean) => { longPressTimer.current = setTimeout(() => openCtxMenu(e, m, isMine), 500); };
  const handleTouchEnd = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } };
  const deleteMsg = async (msgId: string) => { if (!currentRoom) return; await deleteDoc(doc(db, "openRooms", currentRoom.id, "messages", msgId)); setCtxMenu(null); };

  const startWordGame = async () => {
    if (!currentRoom || !nickname) return; setShowSpecialMenu(false);
    await setDoc(doc(db, "wordgame_open", currentRoom.id), { active: true, lastWord: "", lastChar: "", lastPlayer: "", startedBy: nickname });
    await sysMsg(`🎮 ${nickname}님이 끝말잇기를 시작했어요! 먼저 단어를 입력하세요.`);
  };
  const endWordGame = async (reason?: string) => {
    if (!currentRoom || !nickname) return;
    await setDoc(doc(db, "wordgame_open", currentRoom.id), { active: false, lastWord: "", lastChar: "", lastPlayer: "", startedBy: "" });
    if (reason) await sysMsg(reason);
  };

  const openFortune = () => {
    setShowSpecialMenu(false); setShowFortune(true); setFortuneSpinning(true); setSelectedFortune(null);
    let idx = 0;
    fortuneIntervalRef.current = setInterval(() => { idx = (idx + 1) % FORTUNES.length; setFortuneIdx(idx); }, 80);
    setTimeout(() => {
      if (fortuneIntervalRef.current) clearInterval(fortuneIntervalRef.current);
      const final = Math.floor(Math.random() * FORTUNES.length);
      setFortuneIdx(final); setSelectedFortune(FORTUNES[final]); setFortuneSpinning(false);
    }, 1800);
  };

  const openChosungSetup = () => { setShowSpecialMenu(false); setShowChosungSetup(true); };
  const submitChosung = async () => {
    if (!chosungConsonants.trim() || !chosungAnswer.trim() || !currentRoom || !nickname) return;
    setShowChosungSetup(false);
    await setDoc(doc(db, "chosunggame_open", currentRoom.id), { active: true, consonants: chosungConsonants.trim(), answer: chosungAnswer.trim(), startedBy: nickname, solved: false });
    await sysMsg(`❓ ${nickname}님의 초성 퀴즈! 힌트: 【 ${chosungConsonants.trim()} 】 무슨 단어일까요?`);
    setChosungConsonants(""); setChosungAnswer("");
  };
  const endChosungGame = async (msg?: string) => {
    if (!currentRoom || !nickname) return;
    await setDoc(doc(db, "chosunggame_open", currentRoom.id), { active: false, consonants: "", answer: "", startedBy: "", solved: false });
    if (msg) await sysMsg(msg);
  };

  const start369 = async () => {
    if (!currentRoom || !nickname) return; setShowSpecialMenu(false);
    await setDoc(doc(db, "game369_open", currentRoom.id), { active: true, currentNumber: 0, lastPlayer: "", startedBy: nickname });
    await sysMsg(`🔢 ${nickname}님이 369 게임을 시작했어요! 1부터 차례로 세고 3·6·9가 들어간 숫자는 👏로 치세요.`);
  };
  const end369 = async (msg: string) => {
    if (!currentRoom || !nickname) return;
    await setDoc(doc(db, "game369_open", currentRoom.id), { active: false, currentNumber: 0, lastPlayer: "", startedBy: "" });
    await sysMsg(msg);
  };
  const sendClap = async () => {
    if (!game369?.active || !currentRoom || !nickname) return;
    const expected = game369.currentNumber + 1;
    const claps = String(expected).split("").filter(d => "369".includes(d)).length || 1;
    await setDoc(doc(db, "game369_open", currentRoom.id), { active: true, currentNumber: expected, lastPlayer: nickname, startedBy: game369.startedBy });
    await addDoc(collection(db, "openRooms", currentRoom.id, "messages"), { from: nickname, content: "👏".repeat(claps), type: "text", createdAt: serverTimestamp() });
  };

  const filteredRooms = selectedTopic === "전체" ? rooms : rooms.filter((r) => r.topic === selectedTopic);
  const theme = THEMES.find(t => t.id === activeTheme) || THEMES[0];
  const accent = ACCENT[activeTheme] || ACCENT.sky;

  if (!nickname) return (
    <PageContainer>
      <div className="flex items-center justify-center h-[60vh] text-gray-400">로딩 중...</div>
    </PageContainer>
  );

  if (currentRoom) return (
    <div className="fixed inset-0 flex flex-col z-[100]" style={{ background: theme.bg }}>
      {showFireworks && <FireworksOverlay onClose={() => setShowFireworks(false)} />}

      {/* 헤더 */}
      <div className="flex items-center justify-between shrink-0 px-4 py-3 bg-white/70 backdrop-blur-xl border-b border-white/80" style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentRoom(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/60 text-gray-500 hover:bg-white/90 transition active:scale-90">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TOPIC_COLORS[currentRoom.topic] || "bg-gray-100 text-gray-500"}`}>{currentRoom.topic}</span>
            <p className="font-black text-gray-800">{currentRoom.name}</p>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setShowThemePicker(p => !p); }}
          className="w-7 h-7 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform"
          style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}/>
      </div>

      {/* 테마 피커 — 헤더 backdrop-blur stacking context 밖에 렌더링 */}
      {showThemePicker && (
        <div className="fixed top-[56px] right-4 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/80 p-2.5 flex gap-2 z-[9999]"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}
          onClick={(e) => e.stopPropagation()}>
          {THEMES.map(t => {
            const a = ACCENT[t.id];
            return (
              <button key={t.id} title={t.id} onClick={() => { setActiveTheme(t.id); if (currentRoom?.id) localStorage.setItem(`chatTheme_open_${currentRoom.id}`, t.id); setShowThemePicker(false); }}
                className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${activeTheme === t.id ? "scale-110" : "border-white/40"}`}
                style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})`, borderColor: activeTheme === t.id ? a.from : undefined, boxShadow: activeTheme === t.id ? `0 0 0 2px ${a.ring}` : undefined }}/>
            );
          })}
        </div>
      )}

      {/* 게임 상태 바 */}
      {wordGame?.active && (
        <div className="flex items-center justify-between px-4 py-2 bg-sky-50 border-b border-sky-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-sky-700">🎮 끝말잇기 진행 중</span>
            {wordGame.lastChar && <span className="px-2.5 py-0.5 rounded-full bg-sky-200 text-sky-700 text-xs font-black">다음: &apos;{wordGame.lastChar}&apos;</span>}
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
            <span className="px-2.5 py-0.5 rounded-full bg-orange-200 text-orange-700 text-xs font-black">다음: {game369.currentNumber + 1}{is369(game369.currentNumber + 1) ? " → 👏" : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            {is369(game369.currentNumber + 1) && <button onClick={sendClap} className="text-[10px] bg-orange-400 text-white font-black px-2 py-1 rounded-lg">👏 박수</button>}
            <button onClick={() => end369("🏳️ 369 게임이 종료됐어요.")} className="text-[10px] text-slate-400 font-bold px-2">종료</button>
          </div>
        </div>
      )}

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 relative" onClick={() => { setCtxMenu(null); setShowPlusMenu(false); setShowSpecialMenu(false); setShowThemePicker(false); }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-8 -left-8 w-48 h-48 rounded-full blur-3xl opacity-50" style={{ background: theme.blob1 }}/>
          <div className="absolute top-1/3 -right-10 w-40 h-40 rounded-full blur-3xl opacity-40" style={{ background: theme.blob2 }}/>
          <div className="absolute -bottom-6 left-1/3 w-36 h-36 rounded-full blur-3xl opacity-40" style={{ background: theme.blob3 }}/>
        </div>
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-300 text-sm">첫 메시지를 보내보세요!</div>
        )}
        {messages.map((msg) => {
          if (msg.type === "system") return (
            <div key={msg.id} className="flex justify-center my-1">
              <div className="bg-sky-50 border border-sky-100 text-sky-600 text-xs font-bold px-4 py-2 rounded-full">{msg.content}</div>
            </div>
          );
          const isMe = msg.from === nickname;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2`}>
              {!isMe && (
                <div className="w-8 h-8 rounded-full bg-sky-200 flex items-center justify-center text-xs font-black text-white shrink-0 mt-1">{msg.from[0]}</div>
              )}
              <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && <p className="text-xs text-gray-400 ml-1">{msg.from}</p>}
                <div
                  className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap font-medium ${isMe ? "text-white rounded-[1.4rem] rounded-br-md" : "bg-white/80 backdrop-blur-sm text-gray-800 shadow-sm rounded-[1.4rem] rounded-bl-md"}`}
                  style={isMe ? { background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`, boxShadow: `0 4px 20px ${accent.shadow}` } : {}}
                  onContextMenu={(e) => openCtxMenu(e, msg, isMe)}
                  onTouchStart={(e) => handleTouchStart(e, msg, isMe)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                >
                  {msg.replyTo && (
                    <div className={`mb-2 px-2 py-1 rounded-xl border-l-4 text-xs opacity-70 ${isMe ? "border-white/60 bg-white/20" : "border-sky-300 bg-sky-50"}`}>
                      <span className="font-bold">{msg.replyTo.from}</span>:{" "}
                      {msg.replyTo.type === "image" ? "📷 사진" : msg.replyTo.type === "audio" ? "🎵 음성" : msg.replyTo.content?.slice(0, 60)}
                      {(msg.replyTo.content?.length ?? 0) > 60 ? "…" : ""}
                    </div>
                  )}
                  {msg.type === "image" ? (
                    <img src={msg.content} alt="이미지" className="max-w-[220px] max-h-[220px] rounded-2xl object-cover cursor-pointer" onClick={() => setLightboxSrc(msg.content)} />
                  ) : msg.type === "audio" ? (
                    <audio src={msg.content} controls className="max-w-[220px] rounded-xl" />
                  ) : (
                    <span className="break-words">{msg.content}</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-300 mx-1">{formatTime(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        {isSending && (
          <div className="flex justify-end px-4">
            <div className="bg-yellow-400 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
              <span className="flex gap-1 items-center py-0.5">
                <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:0ms]"/>
                <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:150ms]"/>
                <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:300ms]"/>
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 이미지 미리보기 */}
      {pendingImage && (
        <div className="px-3 py-2 bg-white flex items-center gap-3 shrink-0 border-t border-gray-100">
          <img src={pendingImage.previewUrl} alt="미리보기" className="w-14 h-14 rounded-xl object-cover shrink-0" />
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button onClick={cancelPendingImage} disabled={sendingImage} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 text-xs font-bold disabled:opacity-40">✕</button>
            <button onClick={() => sendImage(pendingImage.file)} disabled={sendingImage} className="w-10 h-10 rounded-[12px] bg-sky-400 text-white flex items-center justify-center disabled:opacity-50">
              {sendingImage ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "➤"}
            </button>
          </div>
        </div>
      )}

      {/* 오디오 미리보기 */}
      {pendingAudio && (
        <div className="px-3 py-2 bg-white flex items-center gap-2 shrink-0 border-t border-gray-100">
          <span className="text-lg shrink-0">🎵</span>
          <span className="text-xs font-black text-sky-600 shrink-0">대기중</span>
          <audio src={pendingAudio.url} controls className="flex-1 h-8 min-w-0" />
          <button onClick={cancelAudio} disabled={sendingAudio} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 text-xs font-bold shrink-0 disabled:opacity-40">✕</button>
          <button onClick={sendAudio} disabled={sendingAudio} className="w-10 h-10 rounded-[12px] bg-sky-400 text-white flex items-center justify-center shrink-0 disabled:opacity-50">
            {sendingAudio ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "➤"}
          </button>
        </div>
      )}

      {/* 답장 태그 */}
      {replyTo && (
        <div className="px-4 py-2 bg-sky-50 border-t border-sky-100 flex items-center gap-2 shrink-0">
          <div className="w-1 h-8 rounded-full bg-sky-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-sky-500">↩ {replyTo.from}에게 답장</p>
            <p className="text-xs text-gray-500 truncate">{replyTo.type === "image" ? "📷 사진" : replyTo.type === "audio" ? "🎵 음성" : replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 text-sm font-bold shrink-0">✕</button>
        </div>
      )}

      {/* 입력창 */}
      <div className="px-4 pb-5 pt-2.5 shrink-0">
        <input type="file" ref={imageInputRef} accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { const url = URL.createObjectURL(f); setPendingImage({ file: f, previewUrl: url }); } e.target.value = ""; }}
        />

        <div className="flex items-center gap-2 rounded-full px-3 py-2 transition-all relative overflow-visible"
          style={{ background:"rgba(255,255,255,0.72)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", border:"1.5px solid rgba(255,255,255,0.9)", boxShadow:"0 4px 24px rgba(0,0,0,0.08),0 0 0 1px rgba(186,230,253,0.4)" }}>
        {/* + 버튼 */}
        <div className="relative shrink-0">
          {showPlusMenu && (
            <div className="absolute bottom-[52px] left-0 flex gap-2 z-50 animate-[fadeInUp_0.15s_ease]">
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => { imageInputRef.current?.click(); setShowPlusMenu(false); }}
                className="flex flex-col items-center gap-1 w-14 py-2 rounded-[14px] bg-white border border-sky-200 shadow-md text-sky-600 active:scale-95 transition">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <span className="text-[9px] font-bold text-sky-500">이미지</span>
              </button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => { toggleRecording(); setShowPlusMenu(false); }}
                className={`flex flex-col items-center gap-1 w-14 py-2 rounded-[14px] border shadow-md active:scale-95 transition ${isRecording ? "bg-red-50 border-red-200 text-red-500 animate-pulse" : "bg-white border-sky-200 text-sky-600"}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
                <span className="text-[9px] font-bold">{isRecording ? "녹음중" : "마이크"}</span>
              </button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => { startDictation(); setShowPlusMenu(false); }}
                className={`flex flex-col items-center gap-1 w-14 py-2 rounded-[14px] border shadow-md active:scale-95 transition ${isDictating ? "bg-green-50 border-green-300 text-green-600 animate-pulse" : "bg-white border-sky-200 text-sky-600"}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="4" y1="9" x2="4" y2="15"/><line x1="8" y1="6" x2="8" y2="18"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="16" y1="6" x2="16" y2="18"/><line x1="20" y1="9" x2="20" y2="15"/>
                </svg>
                <span className="text-[9px] font-bold">{isDictating ? "듣는중" : "받아쓰기"}</span>
              </button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setShowDrawCanvas(true); setShowPlusMenu(false); }}
                className="flex flex-col items-center gap-1 w-14 py-2 rounded-[14px] bg-white border border-sky-200 shadow-md text-sky-600 active:scale-95 transition">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                <span className="text-[9px] font-bold text-sky-500">손글씨</span>
              </button>
            </div>
          )}
          <button onClick={() => { setShowPlusMenu((p) => !p); setShowSpecialMenu(false); }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition shrink-0 text-lg font-black ${showPlusMenu ? "bg-sky-400 text-white" : "text-sky-400"}`}>
            {showPlusMenu ? "✕" : "+"}
          </button>
        </div>

        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); if (e.target.value.trim()) setShowSpecialMenu(false); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={wordGame?.active && wordGame.lastChar ? `'${wordGame.lastChar}'(으)로 시작하는 단어` : "메시지 입력..."}
          className="flex-1 bg-transparent px-2 text-[13.5px] outline-none text-gray-700 placeholder:text-gray-400 font-medium"
        />

        {/* 보내기 / # 버튼 */}
        <div className="relative shrink-0">
          {showSpecialMenu && (
            <div className="absolute bottom-[56px] right-0 z-50 animate-[fadeInUp_0.15s_ease]">
              <div className="bg-white rounded-[20px] shadow-xl border border-gray-100 p-3 w-48">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "🎮 끝말잇기", onClick: startWordGame, color: "text-sky-600 border-sky-100 bg-sky-50" },
                    { label: "🔮 오늘의 운세", onClick: openFortune, color: "text-purple-600 border-purple-100 bg-purple-50" },
                    { label: "❓ 초성 퀴즈", onClick: openChosungSetup, color: "text-violet-600 border-violet-100 bg-violet-50" },
                    { label: "🔢 369 게임", onClick: start369, color: "text-orange-600 border-orange-100 bg-orange-50" },
                  ].map(({ label, onClick, color }) => (
                    <button key={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
                      className={`flex items-center justify-center px-2 py-2.5 rounded-[14px] border text-xs font-black active:scale-95 transition ${color}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => { if (input.trim()) { sendMessage(); } else { setShowSpecialMenu((p) => !p); setShowPlusMenu(false); } }}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 font-black text-sm"
            style={input.trim() ? { background:"linear-gradient(135deg,#38bdf8,#6366f1)", boxShadow:"0 4px 16px rgba(56,189,248,0.35)" } : { background:"rgba(186,230,253,0.35)", color:"#38bdf8" }}
          >
            {input.trim() ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            ) : "#"}
          </button>
        </div>
        </div>
      </div>

      {/* 컨텍스트 메뉴 */}
      {ctxMenu && (
        <div className="fixed inset-0 z-[200]" onClick={() => setCtxMenu(null)}>
          <div className="absolute bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden w-40"
            style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={(e) => e.stopPropagation()}>
            <button className="w-full px-4 py-3 text-left text-sm font-bold text-gray-700 active:bg-gray-50 flex items-center gap-2"
              onClick={() => { setReplyTo({ id: ctxMenu.msgId, from: ctxMenu.msg.from, content: ctxMenu.msg.content, type: ctxMenu.msg.type }); setCtxMenu(null); }}>
              <span>↩</span> 답장
            </button>
            {ctxMenu.msg.type === "text" && (
              <button className="w-full px-4 py-3 text-left text-sm font-bold text-gray-700 active:bg-gray-50 flex items-center gap-2 border-t border-gray-50"
                onClick={() => { navigator.clipboard.writeText(ctxMenu.msg.content); setCtxMenu(null); }}>
                <span>📋</span> 복사
              </button>
            )}
            {ctxMenu.isMine && (
              <button className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 active:bg-red-50 flex items-center gap-2 border-t border-gray-50"
                onClick={() => deleteMsg(ctxMenu.msgId)}>
                <span>🗑</span> 삭제
              </button>
            )}
          </div>
        </div>
      )}

      {/* 초성 퀴즈 설정 모달 */}
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

      {/* 운세 모달 */}
      {showFortune && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { if (!fortuneSpinning) setShowFortune(false); }}>
          <div className="mx-6 w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-sky-400 to-cyan-400 px-6 py-6 text-center">
              <p className="text-white/80 text-xs font-black tracking-widest mb-2">오늘의 운세 ✨</p>
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
                    {[0,1,2].map(i => <span key={i} className="w-2.5 h-2.5 rounded-full bg-sky-300" style={{animation:`typingDot 1.2s ease-in-out infinite`, animationDelay:`${i*200}ms`}} />)}
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-slate-700 text-sm leading-relaxed text-center">{selectedFortune?.text}</p>
                  <button onClick={() => setShowFortune(false)} className="mt-5 w-full h-12 rounded-[16px] bg-sky-100 text-sky-600 font-black text-sm active:scale-95 transition">확인 ✨</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 이미지 라이트박스 */}
      {lightboxSrc && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="이미지" className="max-w-full max-h-full object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/20 text-white text-xl flex items-center justify-center" onClick={() => setLightboxSrc(null)}>✕</button>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fortuneSpin { from { transform: scale(0.8); } to { transform: scale(1.1); } }
        @keyframes fortuneReveal { from { transform: scale(0.5) rotate(-15deg); opacity:0; } to { transform: scale(1) rotate(0deg); opacity:1; } }
        @keyframes typingDot { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>
      {showDrawCanvas && (
        <DrawingCanvas
          onSend={sendDrawing}
          onClose={() => setShowDrawCanvas(false)}
          accentFrom={accent.from}
          accentTo={accent.to}
        />
      )}
    </div>
  );

  // 방 목록 뷰
  return (
    <PageContainer>
      <div className="-m-4 bg-gray-50 min-h-screen">
      <div className="px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black bg-yellow-200">OPEN CHAT</span>
          <button onClick={() => router.push("/groupchat")} className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-50 hover:bg-sky-200 transition active:scale-90">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span className="text-xs font-bold text-sky-600">일반</span>
          </button>
          <button onClick={() => router.push("/meetingroom")} className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-50 hover:bg-red-100 transition active:scale-90">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="13" y2="12"/></svg>
            <span className="text-xs font-bold text-red-500">회의</span>
          </button>
          <button onClick={() => router.push("/openchat")} className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-yellow-100 transition active:scale-90">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span className="text-xs font-bold text-yellow-600">오픈</span>
          </button>
        </div>
        <div className="text-xs text-gray-400 mt-0.5">오픈채팅</div>
      </div>

      <div className="px-4 pb-3">
        <button onClick={() => setShowCreate(true)} className="w-full py-2.5 rounded-2xl bg-sky-400 hover:bg-sky-500 text-white text-sm font-black transition active:scale-95 flex items-center justify-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          새 오픈채팅 만들기
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-24 flex flex-col gap-4">
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-1" />
            <p className="font-black text-gray-800 text-base">새 오픈채팅 만들기</p>
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">주제 선택</p>
              <div className="flex flex-wrap gap-2">
                {TOPICS.filter((t) => t !== "전체").map((t) => (
                  <button key={t} onClick={() => setNewRoomTopic(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${newRoomTopic === t ? "bg-sky-400 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">방 이름</p>
              <input autoFocus value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createRoom()}
                placeholder="방 이름을 입력하세요" maxLength={20}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-sky-300 transition"/>
            </div>
            <div className="flex gap-2">
              <button onClick={createRoom} disabled={!newRoomName.trim()} className="flex-1 py-3 rounded-2xl bg-sky-400 text-white text-sm font-black disabled:opacity-40 transition">만들기</button>
              <button onClick={() => setShowCreate(false)} className="px-5 py-3 rounded-2xl bg-gray-100 text-gray-500 text-sm font-bold transition">취소</button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {TOPICS.map((t) => (
          <button key={t} onClick={() => setSelectedTopic(t)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectedTopic === t ? "bg-sky-400 text-white" : "bg-white text-gray-500 hover:bg-gray-100 shadow-sm"}`}>{t}</button>
        ))}
      </div>

      <div className="px-4 flex flex-col gap-2">
        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300 gap-3">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <p className="text-sm">{selectedTopic === "전체" ? "아직 오픈채팅방이 없어요" : `${selectedTopic} 방이 없어요`}</p>
          </div>
        ) : filteredRooms.map((room) => (
          <button key={room.id} onClick={() => setCurrentRoom(room)}
            className="w-full bg-white rounded-2xl px-4 py-4 flex items-center gap-3 text-left hover:bg-gray-50 transition active:scale-[0.99] shadow-sm">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-base font-black ${TOPIC_COLORS[room.topic] || "bg-gray-100 text-gray-500"}`}>{room.name[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-bold text-gray-800 text-sm truncate">{room.name}</p>
                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TOPIC_COLORS[room.topic] || "bg-gray-100 text-gray-500"}`}>{room.topic}</span>
              </div>
              <p className="text-xs text-gray-400 truncate">{room.lastMessage || "대화를 시작해보세요"}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ))}
      </div>
      </div>
    </PageContainer>
  );
}
