"use client";

import { useSeason } from "@/app/SeasonContext";
import { useMemo } from "react";

type Config = { chars: string[]; count: number; driftRange: number };

const CONFIGS: Record<string, Config> = {
  spring: { chars: ["🌸", "🌸", "🌷", "🌿", "🌸"], count: 18, driftRange: 90 },
  summer: { chars: ["✨", "⭐", "💫", "🌟", "✨"],  count: 12, driftRange: 15 },
  autumn: { chars: ["🍂", "🍁", "🍂", "🍃", "🍁"], count: 18, driftRange: 110 },
  winter: { chars: ["❄️", "❄️", "❄️", "✨", "❄️"], count: 24, driftRange: 8  },
};

function rng(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export default function SeasonParticles() {
  const { season } = useSeason();
  const cfg = CONFIGS[season];

  const particles = useMemo(() => {
    if (!cfg) return [];
    return Array.from({ length: cfg.count }, (_, i) => ({
      char:     cfg.chars[Math.floor(rng(i * 2) * cfg.chars.length)],
      left:     rng(i * 3) * 93,
      dur:      10 + rng(i * 5) * 14,
      delay:    -(rng(i * 7) * 22),
      fontSize: 0.6 + rng(i * 11) * 0.8,
      opacity:  0.20 + rng(i * 13) * 0.30,
      drift:    (rng(i * 17) - 0.5) * 2 * cfg.driftRange,
    }));
  }, [season]);

  if (!cfg) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 5 }}
    >
      {particles.map((p, i) => (
        <span
          key={`${season}-${i}`}
          className="absolute top-0 will-change-transform"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.fontSize}rem`,
            opacity: p.opacity,
            animationName: "season-fall",
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            ["--drift" as string]: `${p.drift}px`,
          }}
        >
          {p.char}
        </span>
      ))}
    </div>
  );
}
