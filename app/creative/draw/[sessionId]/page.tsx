"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../firebase";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, setDoc, orderBy, serverTimestamp } from "firebase/firestore";

const COLORS = ["#1a1a1a", "#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ec4899", "#fbbf24"];
const SIZES = [{ label: "S", px: 3 }, { label: "M", px: 7 }, { label: "L", px: 16 }];
const CANVAS_W = 1200;
const CANVAS_H = 800;

type Point = { x: number; y: number };
type Stroke = { id: string; by: string; color: string; size: number; points: Point[] };

export default function DrawSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [nickname, setNickname] = useState<string | null>(null);
  const [partner, setPartner] = useState<string | null>(null);
  const [color, setColor] = useState("#1a1a1a");
  const [sizeIdx, setSizeIdx] = useState(1);
  const [isEraser, setIsEraser] = useState(false);
  const [showExit, setShowExit] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const currentPoints = useRef<Point[]>([]);
  const localStrokeIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setNickname(snap.data().nickname || "유저");
    });
    return () => unsub();
  }, []);

  // 캔버스 흰 배경 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }, []);

  // 파트너 찾기
  useEffect(() => {
    if (!nickname || !sessionId) return;
    (async () => {
      const snap = await getDocs(query(collection(db, "draw_requests"), where("sessionId", "==", sessionId)));
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setPartner(data.from === nickname ? data.to : data.from);
      }
    })();
  }, [nickname, sessionId]);

  // 스트로크 구독 (상대방 그림 실시간 수신)
  useEffect(() => {
    if (!sessionId) return;
    const q = query(collection(db, "draw_sessions", sessionId, "strokes"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const id = change.doc.id;
        if (localStrokeIds.current.has(id)) return;
        const stroke = { id, ...change.doc.data() } as Stroke;
        renderStroke(stroke);
      });
    });
  }, [sessionId]);

  const renderStroke = (stroke: Stroke) => {
    const canvas = canvasRef.current;
    if (!canvas || stroke.points.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  };

  const getPos = (e: React.TouchEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = CANVAS_W / rect.width;
    const sy = CANVAS_H / rect.height;
    if ("touches" in e) {
      const t = (e as React.TouchEvent).touches[0];
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy };
    }
    const me = e as React.MouseEvent;
    return { x: (me.clientX - rect.left) * sx, y: (me.clientY - rect.top) * sy };
  };

  const getCtx = () => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext("2d") : null;
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    drawing.current = true;
    const pos = getPos(e);
    currentPoints.current = [pos];
    ctx.strokeStyle = isEraser ? "#ffffff" : color;
    ctx.lineWidth = isEraser ? SIZES[sizeIdx].px * 4 : SIZES[sizeIdx].px;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const moveDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    currentPoints.current.push(pos);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    // 다음 세그먼트를 위해 현재 위치에서 새 path 시작
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const endDraw = async () => {
    if (!drawing.current || !nickname || !sessionId) return;
    drawing.current = false;
    const points = [...currentPoints.current];
    currentPoints.current = [];
    if (points.length < 2) return;

    const strokeRef = doc(collection(db, "draw_sessions", sessionId, "strokes"));
    localStrokeIds.current.add(strokeRef.id);
    await setDoc(strokeRef, {
      by: nickname,
      color: isEraser ? "#ffffff" : color,
      size: isEraser ? SIZES[sizeIdx].px * 4 : SIZES[sizeIdx].px,
      points,
      createdAt: serverTimestamp(),
    });
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "wagie-draw.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleShare = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "wagie-draw.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "WAGIE 협업 그림 🎨" }).catch(() => {});
      } else {
        handleSave();
      }
    });
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#1a1a2e" }}>

      {/* 상단 바 */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: "#16213e" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowExit(true)}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-lg active:scale-90 transition-transform">
            ‹
          </button>
          <div>
            <p className="text-white font-black text-sm">협업 그림</p>
            {partner && <p className="text-white/50 text-[10px]">with {partner}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95 transition"
            style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>
            저장
          </button>
          <button onClick={handleShare}
            className="px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95 transition bg-white/15">
            공유
          </button>
        </div>
      </div>

      {/* 캔버스 */}
      <div className="flex-1 overflow-hidden p-2">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-2xl touch-none"
          style={{ width: "100%", height: "100%", cursor: isEraser ? "cell" : "crosshair", display: "block" }}
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
        />
      </div>

      {/* 하단 툴바 */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-3" style={{ background: "#16213e" }}>
        <div className="flex gap-2 flex-1 overflow-x-auto">
          {COLORS.map((c) => (
            <button key={c} onClick={() => { setColor(c); setIsEraser(false); }}
              className="shrink-0 active:scale-90 transition-transform"
              style={{
                width: 28, height: 28, borderRadius: "50%", background: c,
                border: !isEraser && color === c ? "3px solid #a855f7" : "2px solid rgba(255,255,255,0.2)",
                boxShadow: !isEraser && color === c ? "0 0 0 2px #a855f7" : "none",
              }}
            />
          ))}
        </div>
        <div className="w-px h-6 bg-white/20 shrink-0" />
        <div className="flex gap-1.5 shrink-0">
          {SIZES.map((s, i) => (
            <button key={i} onClick={() => setSizeIdx(i)}
              className={`rounded-full flex items-center justify-center active:scale-90 transition-all ${sizeIdx === i ? "bg-purple-500" : "bg-white/10"}`}
              style={{ width: 28, height: 28 }}>
              <div className="rounded-full bg-white" style={{ width: s.px, height: s.px }} />
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-white/20 shrink-0" />
        <button onClick={() => setIsEraser(!isEraser)}
          className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-lg active:scale-90 transition-all ${isEraser ? "bg-purple-500" : "bg-white/10"}`}>
          🧹
        </button>
      </div>

      {/* 나가기 확인 다이얼로그 */}
      {showExit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="w-full max-w-xs rounded-[24px] p-6 flex flex-col gap-4" style={{ background: "#16213e", border: "1px solid rgba(168,85,247,0.3)" }}>
            <div className="text-center">
              <p className="text-2xl mb-2">🚪</p>
              <p className="text-white font-black text-lg">나가기</p>
              <p className="text-white/50 text-sm mt-1">그림은 저장되지 않아요.<br/>정말 나갈까요?</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowExit(false)}
                className="flex-1 py-3 rounded-2xl bg-white/10 text-white/70 font-bold text-sm active:scale-95 transition">
                취소
              </button>
              <button onClick={() => router.push("/creative")}
                className="flex-1 py-3 rounded-2xl font-bold text-sm text-white active:scale-95 transition"
                style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>
                나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
