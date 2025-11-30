"use client";

import React, { useRef, useEffect, useState } from "react";

const Sketchbook: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"pen" | "eraser" | "fill">("pen");
  const [lineWidth, setLineWidth] = useState(2);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("#ff0000");

  // Undo/Redo 스택
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth * 0.5;
    canvas.height = window.innerHeight * 0.5;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = strokeColor;
    context.lineWidth = lineWidth;
    context.lineCap = "round";

    canvas.style.boxShadow = "0 8px 20px rgba(0,0,0,0.3)";
    canvas.style.border = "2px solid #ccc";

    setCtx(context);
    saveState(); // 초기 상태 저장
  }, []);

  const saveState = () => {
    if (!ctx || !canvasRef.current) return;
    const imgData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    undoStack.current.push(imgData);
    redoStack.current = [];
  };

  const undo = () => {
    if (undoStack.current.length <= 1 || !ctx) return;
    const lastState = undoStack.current.pop()!;
    redoStack.current.push(lastState);
    const prevState = undoStack.current[undoStack.current.length - 1];
    ctx.putImageData(prevState, 0, 0);
  };

  const redo = () => {
    if (redoStack.current.length === 0 || !ctx) return;
    const nextState = redoStack.current.pop()!;
    ctx.putImageData(nextState, 0, 0);
    undoStack.current.push(nextState);
  };

  const startDrawing = (x: number, y: number) => {
    if (!ctx || tool === "fill") return;
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (x: number, y: number) => {
    if (!isDrawing || !ctx) return;
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "white";
      ctx.lineWidth = 10;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!ctx) return;
    if (tool !== "fill") saveState();
    setIsDrawing(false);
    ctx.closePath();
  };

  const clearCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    saveState();
  };

  const saveCanvas = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "my_drawing.png";
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  // 클릭 한 번으로 전체 채우기
  const handleClick = () => {
    if (!ctx || tool !== "fill") return;
    ctx.fillStyle = fillColor;
    ctx.globalCompositeOperation = "source-over";
    ctx.fill();
    saveState();
  };

  // 마우스 이벤트
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    if (tool === "fill") handleClick();
    else startDrawing(x, y);
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) =>
    draw(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  const handleMouseUp = stopDrawing;
  const handleMouseLeave = stopDrawing;

  // 터치 이벤트
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    if (tool === "fill") handleClick();
    else startDrawing(x, y);
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    draw(touch.clientX - rect.left, touch.clientY - rect.top);
  };
  const handleTouchEnd = stopDrawing;

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="flex gap-2 flex-wrap justify-center items-center">
        <button
          className={`px-4 py-2 border rounded ${
            tool === "pen" ? "bg-gray-300" : "bg-white"
          }`}
          onClick={() => setTool("pen")}
        >
          Pen
        </button>
        <button
          className={`px-4 py-2 border rounded ${
            tool === "eraser" ? "bg-gray-300" : "bg-white"
          }`}
          onClick={() => setTool("eraser")}
        >
          Eraser
        </button>
        <button
          className={`px-4 py-2 border rounded ${
            tool === "fill" ? "bg-gray-300" : "bg-white"
          }`}
          onClick={() => setTool("fill")}
        >
          Fill
        </button>

        <div className="flex gap-2 items-center">
          <label>Stroke:</label>
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="w-10 h-8 p-0 border rounded cursor-pointer"
          />
        </div>
        <div className="flex gap-2 items-center">
          <label>Fill:</label>
          <input
            type="color"
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            className="w-10 h-8 p-0 border rounded cursor-pointer"
          />
        </div>

        <input
          type="range"
          min="1"
          max="10"
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
        />

        {/* Undo / Redo */}
        <button className="px-4 py-2 border rounded bg-gray-200 hover:bg-gray-300" onClick={undo}>
          ⬅️ Undo
        </button>
        <button className="px-4 py-2 border rounded bg-gray-200 hover:bg-gray-300" onClick={redo}>
          ➡️ Redo
        </button>

        <button
          className="px-4 py-2 border rounded bg-red-300 hover:bg-red-400"
          onClick={clearCanvas}
        >
          Clear
        </button>
        <button
          className="px-4 py-2 border rounded bg-green-300 hover:bg-green-400"
          onClick={saveCanvas}
        >
          Save
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="rounded-lg"
      />
    </div>
  );
};

export default Sketchbook;
