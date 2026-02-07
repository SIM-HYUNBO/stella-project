"use client";

import { useEffect, useRef, useState } from "react";

/* ===================== 타입 ===================== */
type DecoType = "plant" | "book" | "coffee" | "photo";
type Deco = { id: number; type: DecoType; x: number; y: number };

type SaveData = {
  decos: Deco[];
  lampOn: boolean;
  windowOpen: boolean;
  canvasImage: string | null;
};

/* ===================== 컴포넌트 ===================== */
export default function UltimateStudyRoomStable() {
  const [now, setNow] = useState(new Date());
  const [lampOn, setLampOn] = useState(false);
  const [windowOpen, setWindowOpen] = useState(true);
  const [decos, setDecos] = useState<Deco[]>([]);
  const [canvasImage, setCanvasImage] = useState<string | null>(null);

  const roomRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  /* ===================== 시간 ===================== */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ===================== 저장 불러오기 ===================== */
  useEffect(() => {
    const raw = localStorage.getItem("ultimate-study-room-stable");
    if (!raw) return;
    try {
      const s: SaveData = JSON.parse(raw);
      setDecos(s.decos || []);
      setLampOn(s.lampOn ?? false);
      setWindowOpen(s.windowOpen ?? true);
      setCanvasImage(s.canvasImage || null);
    } catch {}
  }, []);

  /* ===================== 저장 ===================== */
  const saveAll = () => {
    const data: SaveData = { decos, lampOn, windowOpen, canvasImage };
    localStorage.setItem("ultimate-study-room-stable", JSON.stringify(data));
  };

  /* ===================== canvas 초기화 및 복원 ===================== */
  useEffect(() => {
    const resizeCanvas = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width = canvasRef.current.offsetWidth;
      canvasRef.current.height = canvasRef.current.offsetHeight;
      restoreCanvas();
    };

    const restoreCanvas = () => {
      if (!canvasRef.current || !canvasImage) return;
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.src = canvasImage;
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
      };
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [canvasImage]);

  /* ===================== 낙서 ===================== */
  const draw = (e: React.MouseEvent) => {
    if (!drawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(e.clientX - rect.left, e.clientY - rect.top, 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawTouch = (e: React.TouchEvent) => {
    if (!drawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(touch.clientX - rect.left, touch.clientY - rect.top, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const stopDraw = () => {
    drawing.current = false;
    if (!canvasRef.current) return;
    const data = canvasRef.current.toDataURL("image/png");
    setCanvasImage(data);

    // 10초 후 자동 삭제
    setTimeout(() => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setCanvasImage(null);
      saveAll();
    }, 10000);
  };

  /* ===================== 장식 추가 ===================== */
  const addDeco = (type: DecoType) => {
    const room = roomRef.current;
    if (!room) return;
    const h = room.offsetHeight;
    setDecos((p) => [...p, { id: Date.now(), type, x: 200 + Math.random() * 300, y: h - 260 }]);
  };

  /* ===================== 하늘 ===================== */
  const hour = now.getHours();
  const sky =
    hour >= 6 && hour < 17
      ? "from-[#cfe9ff] via-[#eaf4ff] to-[#ffffff]"
      : hour >= 17 && hour < 20
      ? "from-[#ffd3a1] via-[#f2b58c] to-[#f8e8d6]"
      : "from-[#0f1c2e] via-[#1d3054] to-[#2b426b]";

  /* ===================== UI ===================== */
  return (
    <div ref={roomRef} className="relative w-screen h-screen overflow-hidden font-sans">
      {/* 벽 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f4efe7] to-[#e6ddd1]" />

      {/* 조명 */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background: lampOn
            ? "radial-gradient(circle at 50% 22%, rgba(255,240,200,0.5), transparent 60%)"
            : "rgba(0,0,0,0.35)",
        }}
      />

      {/* 시계 */}
      <div className="absolute top-8 left-8 text-[#4a3f35]">
        <div className="text-2xl font-light">
          {now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="text-xs opacity-60">
          {now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
        </div>
      </div>

      {/* 창문 */}
      <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[48%] h-[36%] bg-[#8b6b4a] rounded-[28px] shadow-2xl p-3">
        <div className={`relative w-full h-full rounded-[20px] overflow-hidden bg-gradient-to-b ${sky}`}>
          <div className="absolute bottom-0 w-full h-[35%] bg-[#355a41]/50 blur-[1px]" />
          <div className="absolute bottom-0 w-full h-[22%] bg-[#294232]/70 blur-[2px]" />
          {(hour >= 20 || hour < 6) && (
            <div
              className="absolute inset-0 opacity-50"
              style={{ background: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "60px 60px" }}
            />
          )}

          <canvas
            ref={canvasRef}
            className="absolute inset-0 cursor-crosshair touch-none"
            onMouseDown={() => (drawing.current = true)}
            onMouseUp={() => { stopDraw(); saveAll(); }}
            onMouseLeave={() => { stopDraw(); saveAll(); }}
            onMouseMove={draw}
            onTouchStart={(e) => { e.preventDefault(); drawing.current = true; drawTouch(e); }}
            onTouchMove={(e) => { e.preventDefault(); drawTouch(e); }}
            onTouchEnd={(e) => { e.preventDefault(); stopDraw(); saveAll(); }}
          />
        </div>
      </div>

      {/* 책상 */}
      <div className="absolute bottom-0 w-full h-[30%] bg-gradient-to-b from-[#3b3026] to-[#251c16]" />

      {/* 장식 */}
      {decos.map((d) => (
        <div
          key={d.id}
          draggable
          onDragEnd={(e) => {
            const room = roomRef.current;
            if (!room) return;
            const rect = room.getBoundingClientRect();
            const x = e.clientX - rect.left - 24;
            const y = e.clientY - rect.top - 24;
            setDecos((p) => p.map((i) => (i.id === d.id ? { ...i, x, y } : i)));
            saveAll();
          }}
          className="absolute text-5xl cursor-grab select-none"
          style={{ left: d.x, top: d.y }}
        >
          {d.type === "plant" && "🌿"}
          {d.type === "book" && "📚"}
          {d.type === "coffee" && "☕"}
          {d.type === "photo" && "🖼️"}
        </div>
      ))}

      {/* 컨트롤 */}
      <div className="absolute top-8 right-8 space-y-3 text-sm">
        <button onClick={() => { setLampOn((v) => !v); saveAll(); }} className="block">💡 조명</button>
        <div className="flex gap-2 pt-2">
          <button onClick={() => { addDeco("plant"); saveAll(); }}>🌿</button>
          <button onClick={() => { addDeco("book"); saveAll(); }}>📚</button>
          <button onClick={() => { addDeco("coffee"); saveAll(); }}>☕</button>
          <button onClick={() => { addDeco("photo"); saveAll(); }}>🖼️</button>
        </div>
      </div>

      {/* 문구 */}
      <div className="absolute bottom-6 w-full text-center text-xs text-white/40">
        마이룸 - 나만의 방
      </div>
    </div>
  );
}
