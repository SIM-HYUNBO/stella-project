"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const COLORS = [
  "bg-red-400", "bg-blue-400", "bg-green-400",
  "bg-yellow-400", "bg-yellow-200", "bg-sky-200",
];

const SHAPES = [
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 1], [1, 1], [2, 1], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],
];

type BlockType = { id: string; color: string; shape: number[][]; };

function MiniShape({ shape, color }: { shape: number[][]; color: string }) {
  const size = 4;
  return (
    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${size}, 16px)` }}>
      {Array.from({ length: size * size }).map((_, i) => {
        const r = Math.floor(i / size);
        const c = i % size;
        const filled = shape.some(([sr, sc]) => sr === r && sc === c);
        return <div key={i} className={`w-4 h-4 rounded-sm ${filled ? color : "bg-transparent"}`} />;
      })}
    </div>
  );
}

export default function DragBlockGame() {
  const router = useRouter();

  const createBoard = () => Array.from({ length: 8 }, () => Array(8).fill(null));
  const randomBlock = (): BlockType => ({
    id: crypto.randomUUID(),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
  });

  const [board, setBoard] = useState<any[][]>(createBoard());
  const [selected, setSelected] = useState<BlockType | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [blocks, setBlocks] = useState<BlockType[]>([randomBlock(), randomBlock(), randomBlock()]);

  function resetGame() {
    setBoard(createBoard());
    setScore(0);
    setGameOver(false);
    setBlocks([randomBlock(), randomBlock(), randomBlock()]);
  }

  function canPlace(shape: number[][], row: number, col: number) {
    for (const [r, c] of shape) {
      const nr = row + r, nc = col + c;
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) return false;
      if (board[nr][nc]) return false;
    }
    return true;
  }

  function clearLines(newBoard: any[][]) {
    let cleared = 0;
    for (let r = 0; r < 8; r++) {
      if (newBoard[r].every(Boolean)) { for (let c = 0; c < 8; c++) newBoard[r][c] = null; cleared++; }
    }
    for (let c = 0; c < 8; c++) {
      let full = true;
      for (let r = 0; r < 8; r++) { if (!newBoard[r][c]) { full = false; break; } }
      if (full) { for (let r = 0; r < 8; r++) newBoard[r][c] = null; cleared++; }
    }
    return cleared;
  }

  function placeBlock(row: number, col: number) {
    if (!selected || gameOver) return;
    if (!canPlace(selected.shape, row, col)) return;
    const newBoard = board.map((line) => [...line]);
    for (const [r, c] of selected.shape) newBoard[row + r][col + c] = selected.color;
    const cleared = clearLines(newBoard);
    setScore((prev) => prev + selected.shape.length + cleared * 10);
    setBoard(newBoard);
    const remain = blocks.filter((b) => b.id !== selected.id);
    const nextBlocks = remain.length === 0 ? [randomBlock(), randomBlock(), randomBlock()] : remain;
    setBlocks(nextBlocks);
    setSelected(null);
    setTimeout(() => {
      let possible = false;
      for (const block of nextBlocks) {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (canPlace(block.shape, r, c)) possible = true;
      }
      if (!possible) setGameOver(true);
    }, 50);
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gray-50" />

      {/* 헤더 */}
      <div className="relative z-10 flex items-center justify-between h-14 px-4 bg-white sticky top-0">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-50 text-transparent bg-clip-text bg-gradient-to-br from-sky-500 to-cyan-400 font-bold text-lg">←</button>
          <span className="font-black text-slate-800 text-base">🧩 블록 게임</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-[12px] bg-sky-100 px-4 py-1.5">
            <p className="text-white font-black text-sm">{score}점</p>
          </div>
          <button onClick={resetGame} className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-50 text-transparent bg-clip-text bg-gradient-to-br from-sky-500 to-cyan-400 font-bold text-base">↺</button>
        </div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row gap-6 items-center justify-center px-4 py-6">
        {/* 게임판 */}
        <div className="rounded-[24px] bg-white p-3">
          <div className="grid grid-cols-8 gap-1 bg-sky-50 p-2 rounded-[16px]">
            {board.map((row, r) =>
              row.map((cell, c) => (
                <div key={`${r}-${c}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => placeBlock(r, c)}
                  className={`w-9 h-9 rounded-[8px]/50 ${cell || "bg-white"}`}
                />
              ))
            )}
          </div>
        </div>

        {/* 블록 선택 */}
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <div className="rounded-[24px] bg-white px-5 py-4">
            <p className="font-black text-slate-800 text-sm mb-4">블록 선택</p>
            <div className="flex flex-wrap gap-3">
              {blocks.map((block) => (
                <div key={block.id} draggable onDragStart={() => setSelected(block)}
                  className={`p-3 rounded-[16px] border-2 cursor-grab active:cursor-grabbing transition-all ${
                    selected?.id === block.id
                      ? "scale-105 bg-sky-50"
                      : "border-sky-100 bg-white/60 hover:bg-sky-50"
                  }`}>
                  <MiniShape shape={block.shape} color={block.color} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] bg-white px-5 py-4 text-sm text-[#9d7060] leading-relaxed">
            <p className="font-black text-slate-800 mb-1">사용법</p>
            블록을 드래그해서 게임판에 올려두세요. 가로 또는 세로로 한 줄을 채우면 지워져요!
          </div>

          {gameOver && (
            <div className="rounded-[24px] bg-white shadow-sm px-5 py-5 text-center">
              <p className="text-2xl font-black text-red-500 mb-1">GAME OVER</p>
              <p className="text-sm text-transparent bg-clip-text bg-gradient-to-br from-sky-500 to-cyan-400 mb-4">최종 점수: {score}점</p>
              <button onClick={resetGame}
                className="px-6 py-3 rounded-[16px] bg-sky-100 text-white font-black active:scale-95 transition-transform">
                다시 시작
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
