"use client";
import React, { useState, useEffect } from "react";
import PageContainer from "@/components/PageContainer";
import CommentBox from "@/components/CommentBox";
import { useRouter } from "next/navigation";
import BrunnerVideo from "@/components/brunnerVideo";

interface DraggableItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label?: string;
  type: string;
}

export default function SciencePage() {
  const router = useRouter();
  const [dragItems, setDragItems] = useState<DraggableItem[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [oxygenLevel, setOxygenLevel] = useState(0);
  const [fillOxygen, setFillOxygen] = useState(false);
  const [flaskFill, setFlaskFill] = useState(0);
  const [fillFlask, setFillFlask] = useState(false);
  const [fireOn, setFireOn] = useState(false);

  useEffect(() => {
    setDragItems([
      { id: "tank", x: 200, y: 200, width: 300, height: 200, color: "#cceeff", type: "tank" },
      { id: "bottle", x: 250, y: 350, width: 50, height: 100, color: "#87ceeb", type: "bottle" },
      { id: "flask", x: 500, y: 250, width: 60, height: 80, color: "#ffffcc", type: "flask" },
      { id: "funnel", x: 550, y: 150, width: 50, height: 40, color: "#a9a9a9", type: "funnel" },
      { id: "mnO2", x: 600, y: 200, width: 40, height: 40, color: "#8b0000", type: "chemical", label: "MnO₂" },
      { id: "h2O2", x: 650, y: 200, width: 40, height: 40, color: "#add8e6", type: "chemical", label: "H₂O₂" },
      { id: "tube1", x: 480, y: 250, width: 10, height: 100, color: "#333", type: "tube" },
      { id: "tube2", x: 560, y: 250, width: 100, height: 10, color: "#333", type: "tubeG" },
      { id: "fire", x: 100, y: 400, width: 10, height: 60, color: "orange", type: "fire" },
    ]);
  }, []);

  // ----------------- 드래그 이벤트 -----------------
  const startDrag = (x: number, y: number, id: string) => {
    const item = dragItems.find((i) => i.id === id);
    if (!item) return;
    setDraggingId(id);
    setOffset({ x: x - item.x, y: y - item.y });
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    startDrag(e.clientX, e.clientY, id);
  };

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    e.stopPropagation();
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY, id);
  };

  const handleMove = (x: number, y: number) => {
    if (!draggingId) return;
    setDragItems((prev) =>
      prev.map((i) =>
        i.id === draggingId ? { ...i, x: x - offset.x, y: y - offset.y } : i
      )
    );
  };

  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const handleTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);

  const handleMouseUp = () => setDraggingId(null);
  const handleTouchEnd = () => setDraggingId(null);
  // -------------------------------------------------

  useEffect(() => {
    if (!fillOxygen || oxygenLevel >= 100) return;
    const interval = setInterval(() => setOxygenLevel((prev) => Math.min(prev + 1, 100)), 50);
    return () => clearInterval(interval);
  }, [fillOxygen, oxygenLevel]);

  useEffect(() => {
    if (!fillFlask || flaskFill >= 100) return;
    const interval = setInterval(() => setFlaskFill((prev) => Math.min(prev + 1, 100)), 80);
    return () => clearInterval(interval);
  }, [fillFlask, flaskFill]);

  return (
    <PageContainer>
      <div
        className="relative w-full h-screen bg-white overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 오른쪽 상단 백 버튼 */}
        <button
          onClick={() => router.push("/study")}
          className="absolute top-6 right-4 text-orange-600 hover:underline text-lg"
        >
          « back
        </button>

        {/* 제목 + 설명 */}
        <div className="absolute top-6 left-1/2 lg:left-80 transform -translate-x-1/2 flex flex-col items-start">
          <h1 className="text-5xl text-orange-400 text-center lg:text-left">Science</h1>
          <p className="text-orange-900 text-2xl mt-2 text-center lg:text-left">
            Drag to generate oxygen and ignite the torch with it.
          </p>
        </div>

        {/* 드래그 가능한 실험 도구들 */}
        {dragItems.map((item) => (
          <div
            key={item.id}
            onMouseDown={(e) => handleMouseDown(e, item.id)}
            onTouchStart={(e) => handleTouchStart(e, item.id)}
            style={{
              position: "absolute",
              left: item.x,
              top: item.y,
              width: item.width,
              height: item.height,
              backgroundColor: item.color,
              borderRadius: item.type === "bottle" || item.type === "flask" ? "10px" : "4px",
              border: "1px solid #333",
              cursor: "grab",
              zIndex: item.type === "tank" ? 0 : 10,
              transform: item.type === "fire" ? "rotate(-15deg)" : "none",
            }}
          >
            {item.id === "bottle" && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "100%",
                  height: `${oxygenLevel}%`,
                  backgroundColor: "#ffffff",
                  borderRadius: "10px 10px 0 0",
                  transition: "height 0.05s linear",
                }}
              />
            )}
            {item.id === "flask" && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "100%",
                  height: `${flaskFill}%`,
                  backgroundColor: "#ffffff",
                  borderRadius: "10px 10px 0 0",
                  transition: "height 0.05s linear",
                  overflow: "hidden",
                }}
              />
            )}
            {item.type === "fire" && fireOn && (
              <div
                style={{
                  position: "absolute",
                  bottom: "0",
                  left: "-10px",
                  width: "30px",
                  height: "60px",
                  background: "linear-gradient(to top, orange 40%, red 60%, yellow 100%)",
                  clipPath:
                    "polygon(50% 0%, 60% 20%, 70% 40%, 60% 60%, 50% 100%, 40% 60%, 30% 40%, 40% 20%)",
                  animation: "flicker 0.1s infinite alternate",
                }}
              />
            )}
            {item.label && <span className="absolute text-xs text-white font-bold">{item.label}</span>}
          </div>
        ))}

        <style>{`
          @keyframes flicker {
            0% { transform: scaleY(1) rotate(-15deg); }
            50% { transform: scaleY(1.2) rotate(-10deg); }
            100% { transform: scaleY(0.9) rotate(-20deg); }
          }
        `}</style>
      </div>

      <BrunnerVideo
        title=""
        url="/Screen Recording - Made with RecordCast (3).webm"
        className="mb-8"
        originalWidth={640}
        originalHeight={360}
      />
      <CommentBox />
    </PageContainer>
  );
}
