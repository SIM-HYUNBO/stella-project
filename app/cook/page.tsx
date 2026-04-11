"use client";

import { useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

export default function DragSlime() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [slimeRadius, setSlimeRadius] = useState(80);
  const [slimePos, setSlimePos] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });

  const slimeColor = "hsl(160, 80%, 60%)";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    setSlimePos({ x: centerX, y: centerY });

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      if (dragging) {
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        setSlimeRadius(Math.max(40, 80 + dist / 3)); // 늘어나는 정도
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const dx = e.clientX - slimePos.x;
      const dy = e.clientY - slimePos.y;
      if (Math.sqrt(dx * dx + dy * dy) < slimeRadius) {
        setDragging(true);
      }
    };

    const handleMouseUp = () => {
      setDragging(false);
      setSlimeRadius(80); // 원래 크기로 복원
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 검은 배경
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 슬라임 그리기
      const gradient = ctx.createRadialGradient(
        slimePos.x, slimePos.y, slimeRadius / 4,
        slimePos.x, slimePos.y, slimeRadius
      );
      gradient.addColorStop(0, slimeColor);
      gradient.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(slimePos.x, slimePos.y, slimeRadius, 0, Math.PI * 2);
      ctx.fill();

      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, slimeRadius, slimePos]);

  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-screen h-screen" />;
}