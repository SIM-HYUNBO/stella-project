"use client";
import { useState } from "react";

export type StarLine = [number, number];

export const STARS: { id: number; x: number; y: number }[] = [
  { id: 0,  x: 12, y: 18 }, { id: 1,  x: 28, y: 8  }, { id: 2,  x: 45, y: 13 },
  { id: 3,  x: 62, y: 7  }, { id: 4,  x: 77, y: 15 }, { id: 5,  x: 90, y: 9  },
  { id: 6,  x: 94, y: 28 }, { id: 7,  x: 83, y: 38 }, { id: 8,  x: 68, y: 30 },
  { id: 9,  x: 52, y: 40 }, { id: 10, x: 36, y: 34 }, { id: 11, x: 20, y: 43 },
  { id: 12, x: 7,  y: 52 }, { id: 13, x: 14, y: 63 }, { id: 14, x: 33, y: 62 },
  { id: 15, x: 52, y: 58 }, { id: 16, x: 68, y: 65 }, { id: 17, x: 82, y: 56 },
  { id: 18, x: 92, y: 64 }, { id: 19, x: 96, y: 46 }, { id: 20, x: 43, y: 76 },
  { id: 21, x: 24, y: 80 }, { id: 22, x: 60, y: 83 },
];

const BG_DOTS = [
  [5,5],[18,3],[38,6],[55,4],[70,9],[82,3],[95,7],
  [3,22],[10,35],[22,25],[40,22],[60,18],[72,27],[88,20],
  [2,68],[9,76],[20,70],[36,80],[50,68],[65,74],[80,80],[92,72],
];

export default function ConstellationSky({
  initialLines,
  onSave,
  onBack,
}: {
  initialLines: StarLine[];
  onSave: (lines: StarLine[]) => Promise<void> | void;
  onBack: () => void;
}) {
  const [lines, setLines] = useState<StarLine[]>(initialLines);
  const [sel, setSel] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const tap = (id: number) => {
    if (sel === null) { setSel(id); return; }
    if (sel === id)  { setSel(null); return; }
    const a = Math.min(sel, id), b = Math.max(sel, id);
    const exists = lines.some(([x, y]) => x === a && y === b);
    setLines(ls => exists ? ls.filter(([x, y]) => !(x === a && y === b)) : [...ls, [a, b]]);
    setSel(null);
  };

  const save = async () => {
    setSaving(true);
    await onSave(lines);
    setSaving(false);
    onBack();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden select-none"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #1a1a52 0%, #050510 70%)" }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* 배경 잔별 */}
        {BG_DOTS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={0.28} fill="rgba(200,210,255,0.35)" />
        ))}

        {/* 연결선 */}
        {lines.map(([a, b]) => {
          const A = STARS[a], B = STARS[b];
          return (
            <line key={`${a}-${b}`}
              x1={A.x} y1={A.y} x2={B.x} y2={B.y}
              stroke="rgba(180,200,255,0.65)" strokeWidth="0.35" strokeLinecap="round"
            />
          );
        })}

        {/* 별 */}
        {STARS.map(s => (
          <g key={s.id} onClick={() => tap(s.id)} style={{ cursor: "pointer" }}>
            <circle cx={s.x} cy={s.y} r={4.5} fill="transparent" />
            {sel === s.id && (
              <circle cx={s.x} cy={s.y} r={2.8} fill="rgba(200,220,255,0.15)" />
            )}
            <circle
              cx={s.x} cy={s.y}
              r={sel === s.id ? 1.7 : 1.0}
              fill={sel === s.id ? "#fff" : "#c8d2ff"}
              style={{ filter: sel === s.id ? "drop-shadow(0 0 2px #fff)" : undefined }}
            />
          </g>
        ))}
      </svg>

      {/* 헤더 */}
      <div
        className="absolute top-0 left-0 right-0 px-5 pt-11 pb-5 flex items-center justify-between"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,5,0.65), transparent)" }}
      >
        <button onClick={onBack} className="text-white/50 text-sm active:opacity-50">
          ← 방으로
        </button>
        <div className="text-center">
          <p className="text-white/70 text-xs font-bold tracking-wider">밤하늘 ✦</p>
          {sel !== null && (
            <p className="text-white/40 text-[10px] mt-0.5">다른 별을 눌러 연결해봐</p>
          )}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="text-white font-bold text-sm active:opacity-50 disabled:opacity-30"
        >
          {saving ? "…" : "저장 ✓"}
        </button>
      </div>

      {/* 하단 힌트 */}
      <p className="absolute bottom-8 left-0 right-0 text-center text-[10px] text-white/20 pointer-events-none">
        별 두 개를 눌러 연결 · 같은 별 다시 누르면 선 삭제
      </p>
    </div>
  );
}
