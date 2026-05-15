"use client";

import React, { useState } from "react";

const COLORS = [
  "bg-red-400",
  "bg-blue-400",
  "bg-green-400",
  "bg-yellow-400",
  "bg-pink-400",
  "bg-purple-400",
];

const SHAPES = [
  [[0, 0]],

  [
    [0, 0],
    [0, 1],
  ],

  [
    [0, 0],
    [1, 0],
  ],

  [
    [0, 0],
    [0, 1],
    [0, 2],
  ],

  [
    [0, 0],
    [1, 0],
    [2, 0],
  ],

  [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],

  [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
  ],

  [
    [0, 1],
    [1, 1],
    [2, 1],
    [2, 0],
  ],

  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
  ],
];

type BlockType = {
  id: string;
  color: string;
  shape: number[][];
};

function MiniShape({
  shape,
  color,
}: {
  shape: number[][];
  color: string;
}) {
  const size = 4;

  return (
    <div
      className="grid gap-1"
      style={{
        gridTemplateColumns: `repeat(${size}, 18px)`,
      }}
    >
      {Array.from({ length: size * size }).map((_, i) => {
        const r = Math.floor(i / size);
        const c = i % size;

        const filled = shape.some(
          ([sr, sc]) => sr === r && sc === c
        );

        return (
          <div
            key={i}
            className={`w-[18px] h-[18px] rounded ${
              filled ? color : "bg-transparent"
            }`}
          />
        );
      })}
    </div>
  );
}

export default function DragBlockGame() {
  const createBoard = () =>
    Array.from({ length: 8 }, () =>
      Array(8).fill(null)
    );

  const randomBlock = (): BlockType => ({
    id: crypto.randomUUID(),
    color:
      COLORS[
        Math.floor(Math.random() * COLORS.length)
      ],
    shape:
      SHAPES[
        Math.floor(Math.random() * SHAPES.length)
      ],
  });

  const [board, setBoard] = useState<any[][]>(
    createBoard()
  );

  const [selected, setSelected] =
    useState<BlockType | null>(null);

  const [score, setScore] = useState(0);

  const [gameOver, setGameOver] =
    useState(false);

  const [blocks, setBlocks] = useState<BlockType[]>(
    [randomBlock(), randomBlock(), randomBlock()]
  );

  function resetGame() {
    setBoard(createBoard());
    setScore(0);
    setGameOver(false);

    setBlocks([
      randomBlock(),
      randomBlock(),
      randomBlock(),
    ]);
  }

  function canPlace(
    shape: number[][],
    row: number,
    col: number
  ) {
    for (const [r, c] of shape) {
      const nr = row + r;
      const nc = col + c;

      if (
        nr < 0 ||
        nr >= 8 ||
        nc < 0 ||
        nc >= 8
      ) {
        return false;
      }

      if (board[nr][nc]) {
        return false;
      }
    }

    return true;
  }

  function clearLines(newBoard: any[][]) {
    let cleared = 0;

    for (let r = 0; r < 8; r++) {
      const full = newBoard[r].every(Boolean);

      if (full) {
        for (let c = 0; c < 8; c++) {
          newBoard[r][c] = null;
        }

        cleared++;
      }
    }

    for (let c = 0; c < 8; c++) {
      let full = true;

      for (let r = 0; r < 8; r++) {
        if (!newBoard[r][c]) {
          full = false;
          break;
        }
      }

      if (full) {
        for (let r = 0; r < 8; r++) {
          newBoard[r][c] = null;
        }

        cleared++;
      }
    }

    return cleared;
  }

  function placeBlock(row: number, col: number) {
    if (!selected || gameOver) return;

    if (!canPlace(selected.shape, row, col)) {
      return;
    }

    const newBoard = board.map((line) => [
      ...line,
    ]);

    for (const [r, c] of selected.shape) {
      newBoard[row + r][col + c] =
        selected.color;
    }

    const cleared = clearLines(newBoard);

    setScore(
      (prev) =>
        prev +
        selected.shape.length +
        cleared * 10
    );

    setBoard(newBoard);

    const remain = blocks.filter(
      (b) => b.id !== selected.id
    );

    const nextBlocks =
      remain.length === 0
        ? [
            randomBlock(),
            randomBlock(),
            randomBlock(),
          ]
        : remain;

    setBlocks(nextBlocks);

    setSelected(null);

    setTimeout(() => {
      let possible = false;

      for (const block of nextBlocks) {
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            if (
              canPlace(block.shape, r, c)
            ) {
              possible = true;
            }
          }
        }
      }

      if (!possible) {
        setGameOver(true);
      }
    }, 50);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black">
              🧩 블록 게임
            </h1>

            <p className="text-gray-400 mt-1">
              블록을 드래그해서 놓아봐!
            </p>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-400">
              점수
            </div>

            <div className="text-3xl font-black">
              {score}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
          <div className="grid grid-cols-8 gap-1 bg-gray-200 p-2 rounded-2xl">
            {board.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  onDragOver={(e) =>
                    e.preventDefault()
                  }
                  onDrop={() =>
                    placeBlock(r, c)
                  }
                  className={`w-10 h-10 rounded-lg border border-white ${
                    cell || "bg-white"
                  }`}
                />
              ))
            )}
          </div>

          <div className="flex flex-col gap-4 w-full max-w-xs">
            <div className="font-bold text-lg">
              블록
            </div>

            <div className="flex flex-wrap gap-4">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() =>
                    setSelected(block)
                  }
                  className={`p-3 rounded-2xl border-4 cursor-grab active:cursor-grabbing bg-gray-50 ${
                    selected?.id === block.id
                      ? "border-black scale-105"
                      : "border-transparent"
                  }`}
                >
                  <MiniShape
                    shape={block.shape}
                    color={block.color}
                  />
                </div>
              ))}
            </div>

            {gameOver && (
              <div className="bg-red-100 border border-red-300 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-red-500 mb-2">
                  GAME OVER
                </div>

                <button
                  onClick={resetGame}
                  className="px-5 py-3 rounded-xl bg-black text-white font-bold"
                >
                  다시 시작
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}                 