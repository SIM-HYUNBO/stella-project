"use client";

import { useState, useEffect, useRef } from "react";
import { auth, db } from "@/app/firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

// 🔹 타입 정의
type Message = { id: string; user: string; content: string; createdAt?: any };
type Category = "공부" | "미술" | "노래/댄스" | "얼굴";
type Point = { x: number; y: number; color: string; size: number; uid: string; createdAt: any };

// 🔹 ArtBoard 컴포넌트
function ArtBoard({ roomId, nickname }: { roomId: string; nickname: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(4);
  const [points, setPoints] = useState<Point[]>([]);
  const [windowWidth, setWindowWidth] = useState<number>(0);

  // 화면 크기
  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctxRef.current = ctx;
  }, []);

  // 실시간 그림 불러오기
  useEffect(() => {
    const q = query(collection(db, "art", roomId, "points"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const p = change.doc.data() as Point;
          const scale = p.uid === nickname ? 1 : 1 / 16;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * scale;
          ctx.beginPath();
          ctx.moveTo(p.x * scale, p.y * scale);
          ctx.lineTo(p.x * scale, p.y * scale);
          ctx.stroke();
        }
      });
    });
    return () => unsub();
  }, [nickname, roomId]);

  const getPos = (e: any) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = () => setDrawing(true);
  const endDraw = () => setDrawing(false);

  const draw = async (e: any) => {
    if (!drawing) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { x, y } = getPos(e);

    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.stroke();

    await addDoc(collection(db, "art", roomId, "points"), {
      x, y, color, size, uid: nickname, createdAt: serverTimestamp()
    });
  };

  return (
    <div className="mb-2">
      <div className="flex gap-2 mb-1 items-center">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <input type="range" min={2} max={20} value={size} onChange={(e) => setSize(Number(e.target.value))} />
      </div>
      <canvas
        ref={canvasRef}
        className="w-full bg-white border rounded-xl"
        onMouseDown={startDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onMouseMove={draw}
      />
    </div>
  );
}

// 🔹 메인 채팅 + 미술
export default function ChatWithArtRoom() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [category, setCategory] = useState<Category>("공부");
  const [isContracted, setIsContracted] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageSound = useRef<HTMLAudioElement | null>(null);
  const prevMessageCount = useRef(0);

  // 🔹 로그인 + 계약 확인
  useEffect(() => {
    return auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setNickname(null);
        setIsContracted(false);
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setNickname(snap.data().nickname || "유저");
        setIsContracted(!!snap.data().isContracted);
      } else {
        setNickname("유저");
        setIsContracted(false);
      }
    });
  }, []);

  // 🔹 수신음
  useEffect(() => {
    messageSound.current = new Audio("/sounds/message.mp3");
  }, []);

  // 🔹 메시지 구독
  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({
        id: d.id,
        user: d.data().user,
        content: d.data().content,
        createdAt: d.data().createdAt,
      }));
      if (msgs.length > prevMessageCount.current && msgs[msgs.length - 1]?.user !== nickname) {
        messageSound.current?.play().catch(() => {});
      }
      prevMessageCount.current = msgs.length;
      setMessages(msgs);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [nickname]);

  const sendMessage = async () => {
    if (!input.trim() || !nickname) return;
    await addDoc(collection(db, "messages"), {
      user: nickname,
      content: input.trim(),
      createdAt: serverTimestamp(),
    });
    setInput("");
  };

  // 🔹 계약 미가입 처리
 const alwaysAllowed = ["관리자", "나율", "프레드"];

if (!nickname) return <div>로딩중...</div>;

if (!alwaysAllowed.includes(nickname) && isContracted === false) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <p className="mb-4 text-lg">계약 회원만 이용할 수 있습니다.</p>
      <button
        onClick={() => window.location.href="/contract"}
        className="px-4 py-2 rounded bg-amber-400 font-bold"
      >
        계약하러 가기
      </button>
    </div>
  );
}


  if (!nickname || isContracted === null) return <div>로딩중...</div>;

  return (
    <div className="flex flex-col fixed inset-0 bg-white">

      {/* 상단 */}
      <div className="bg-amber-100 border-b">
        <div className="h-12 flex items-center justify-center font-extrabold">
          천왁즈 · {category}
        </div>
        <div className="flex justify-around pb-2">
          {["공부", "미술", "노래/댄스", "얼굴"].map((t) => (
            <button
              key={t}
              onClick={() => setCategory(t as Category)}
              className={`px-4 py-2 rounded-xl ${
                category === t ? "bg-amber-300 font-bold" : "hover:bg-amber-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {category === "미술" && (
          <ArtBoard roomId="global-room" nickname={nickname} />
        )}
      </div>

      {/* 채팅 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-xs px-3 py-2 rounded-xl ${
              m.user === nickname ? "self-end bg-amber-300" : "self-start bg-gray-200"
            }`}
          >
            <div className="text-xs font-semibold opacity-70">{m.user}</div>
            {m.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 */}
      <div className="flex px-4 py-3 border-t gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 rounded-xl px-4 py-2 border"
          placeholder="메시지 입력..."
        />
        <button
          onClick={sendMessage}
          className="px-5 py-2 rounded-xl bg-amber-400 font-semibold"
        >
          전송
        </button>
      </div>
    </div>
  );
}
