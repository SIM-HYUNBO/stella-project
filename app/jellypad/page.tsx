"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const JELLY: Record<string, { tint: string; glow: string; color: string }> = {
  "1": { tint: "rgba(255, 80, 130, 0.22)", glow: "rgba(255,80,130,0.30)", color: "#e8005a" },
  "2": { tint: "rgba(255, 150, 50, 0.22)", glow: "rgba(255,150,50,0.30)", color: "#d46800" },
  "3": { tint: "rgba(240, 200, 0, 0.22)", glow: "rgba(240,200,0,0.30)", color: "#b89000" },
  "4": { tint: "rgba(40, 180, 80, 0.22)", glow: "rgba(40,180,80,0.30)", color: "#1a8f28" },
  "5": { tint: "rgba(0, 190, 180, 0.22)", glow: "rgba(0,190,180,0.30)", color: "#009090" },
  "6": { tint: "rgba(30, 140, 255, 0.22)", glow: "rgba(30,140,255,0.30)", color: "#0072e5" },
  "7": { tint: "rgba(130, 80, 220, 0.22)", glow: "rgba(130,80,220,0.30)", color: "#5e35b1" },
  "8": { tint: "rgba(220, 50, 130, 0.22)", glow: "rgba(220,50,130,0.30)", color: "#c2185b" },
  "9": { tint: "rgba(0, 170, 150, 0.22)", glow: "rgba(0,170,150,0.30)", color: "#00796b" },
  "0": { tint: "rgba(0, 140, 220, 0.22)", glow: "rgba(0,140,220,0.30)", color: "#0277bd" },
  "⌫": { tint: "rgba(150, 160, 170, 0.18)", glow: "rgba(150,160,170,0.20)", color: "#78909c" },
};

function JellyBtn({
  label, pressCount, onPress,
}: {
  label: string; pressCount: number; onPress: () => void;
}) {
  const j = JELLY[label];

  return (
    <button
      onClick={onPress}
      style={{
        width: 86,
        height: 86,
        borderRadius: 26,
        background: `linear-gradient(160deg, rgba(255,255,255,0.78) 0%, ${j.tint} 100%)`,
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border: "1.5px solid rgba(255,255,255,0.92)",
        boxShadow: `
          0 12px 32px ${j.glow},
          0 3px 10px rgba(0,0,0,0.07),
          inset 0 1.5px 0 rgba(255,255,255,0.95),
          inset 0 -1px 0 rgba(0,0,0,0.04)
        `.replace(/\s+/g, " "),
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        padding: 0,
        flexShrink: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* 상단 광택 */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "50%",
        background: "linear-gradient(to bottom, rgba(255,255,255,0.65), rgba(255,255,255,0))",
        borderRadius: "26px 26px 50% 50%",
        pointerEvents: "none",
      }} />
      {/* 텍스트 */}
      <div
        key={pressCount}
        className={pressCount > 0 ? "jelly-pop" : ""}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "100%", height: "100%",
          fontSize: label === "⌫" ? 22 : 32,
          fontWeight: 900,
          color: j.color,
          letterSpacing: "-0.01em",
          position: "relative",
        }}
      >
        {label}
      </div>
    </button>
  );
}

export default function JellyPad() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [presses, setPresses] = useState<Record<string, number>>({});

  const press = (key: string) => {
    setPresses(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
    if (key === "⌫") {
      setValue(v => v.slice(0, -1));
    } else if (value.length < 12) {
      setValue(v => v + key);
    }
  };

  const rows = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]];

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(160deg, #fdf4ff 0%, #e8f4fd 50%, #fff8e1 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      userSelect: "none",
    }}>
      <style>{`
        @keyframes jellyPop {
          0%   { transform: scale(1); }
          18%  { transform: scale(0.83, 1.17); }
          38%  { transform: scale(1.13, 0.87); }
          56%  { transform: scale(0.93, 1.07); }
          72%  { transform: scale(1.04, 0.96); }
          86%  { transform: scale(0.98, 1.02); }
          100% { transform: scale(1); }
        }
        .jelly-pop {
          animation: jellyPop 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
      `}</style>

      <button
        onClick={() => router.back()}
        style={{
          position: "absolute", top: 20, left: 20,
          width: 42, height: 42, borderRadius: 14,
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1.5px solid rgba(255,255,255,0.9)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: 18, color: "#636e72",
        }}
      >
        ←
      </button>

      <p style={{
        fontSize: 11, fontWeight: 800, color: "#b2bec3",
        letterSpacing: "0.25em", marginBottom: 28, textTransform: "uppercase",
      }}>
        JELLY PAD
      </p>

      {/* 디스플레이 */}
      <div style={{
        width: "100%", maxWidth: 306,
        minHeight: 76,
        background: "linear-gradient(160deg, rgba(255,255,255,0.80) 0%, rgba(255,255,255,0.55) 100%)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        borderRadius: 24,
        border: "1.5px solid rgba(255,255,255,0.95)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08), inset 0 1.5px 0 rgba(255,255,255,0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: value ? "flex-end" : "center",
        padding: "0 24px",
        marginBottom: 28,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "50%",
          background: "linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0))",
          borderRadius: "24px 24px 50% 50%",
          pointerEvents: "none",
        }} />
        <span style={{
          fontSize: value.length > 8 ? 28 : value.length > 5 ? 36 : 44,
          fontWeight: 800,
          color: value ? "#2d3436" : "#dfe6e9",
          letterSpacing: "0.04em",
          fontVariantNumeric: "tabular-nums",
          transition: "font-size 0.15s, color 0.15s",
          position: "relative",
        }}>
          {value || "0"}
        </span>
      </div>

      {/* 버튼 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 14 }}>
            {row.map(k => (
              <JellyBtn key={k} label={k} pressCount={presses[k] || 0} onPress={() => press(k)} />
            ))}
          </div>
        ))}

        {/* 마지막 줄: 빈칸 · 0 · ⌫ */}
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ width: 86, height: 86 }} />
          <JellyBtn label="0" pressCount={presses["0"] || 0} onPress={() => press("0")} />
          <JellyBtn label="⌫" pressCount={presses["⌫"] || 0} onPress={() => press("⌫")} />
        </div>
      </div>
    </div>
  );
}
