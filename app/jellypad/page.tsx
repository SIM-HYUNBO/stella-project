"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CANDY: Record<string, { bg: string; glow: string }> = {
  "1": { bg: "linear-gradient(145deg, #ff8fab, #e8005a)", glow: "rgba(232,0,90,0.28)" },
  "2": { bg: "linear-gradient(145deg, #ffbf69, #e07000)", glow: "rgba(224,112,0,0.28)" },
  "3": { bg: "linear-gradient(145deg, #ffe566, #e6b800)", glow: "rgba(230,184,0,0.28)" },
  "4": { bg: "linear-gradient(145deg, #6bcb77, #1a8f28)", glow: "rgba(26,143,40,0.28)" },
  "5": { bg: "linear-gradient(145deg, #4ecdc4, #009090)", glow: "rgba(0,144,144,0.28)" },
  "6": { bg: "linear-gradient(145deg, #74b9ff, #0072e5)", glow: "rgba(0,114,229,0.28)" },
  "7": { bg: "linear-gradient(145deg, #b39ddb, #5e35b1)", glow: "rgba(94,53,177,0.28)" },
  "8": { bg: "linear-gradient(145deg, #f48fb1, #c2185b)", glow: "rgba(194,24,91,0.28)" },
  "9": { bg: "linear-gradient(145deg, #80cbc4, #00796b)", glow: "rgba(0,121,107,0.28)" },
  "0": { bg: "linear-gradient(145deg, #81d4fa, #0277bd)", glow: "rgba(2,119,189,0.28)" },
  "⌫": { bg: "linear-gradient(145deg, #eceff1, #90a4ae)", glow: "rgba(144,164,174,0.22)" },
};

function JellyBtn({
  label, pressCount, onPress, wide,
}: {
  label: string; pressCount: number; onPress: () => void; wide?: boolean;
}) {
  const c = CANDY[label];
  const size = wide ? 186 : 86;
  const isDelete = label === "⌫";

  return (
    <button
      onClick={onPress}
      style={{
        width: size,
        height: 86,
        borderRadius: 26,
        background: c.bg,
        border: "none",
        boxShadow: `0 10px 28px ${c.glow}, 0 3px 8px rgba(0,0,0,0.10), inset 0 1.5px 2px rgba(255,255,255,0.55)`,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        padding: 0,
        flexShrink: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* 광택 */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "46%",
        background: "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0))",
        borderRadius: "26px 26px 50% 50%",
        pointerEvents: "none",
      }} />
      {/* 바닥 반사 */}
      <div style={{
        position: "absolute", bottom: 0, left: "10%", right: "10%", height: "20%",
        background: "rgba(0,0,0,0.06)",
        borderRadius: "0 0 20px 20px",
        pointerEvents: "none",
      }} />
      <div
        key={pressCount}
        className={pressCount > 0 ? "jelly-pop" : ""}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "100%", height: "100%",
          fontSize: isDelete ? 22 : 32,
          fontWeight: 800,
          color: isDelete ? "#546e7a" : "white",
          textShadow: isDelete ? "none" : "0 1px 4px rgba(0,0,0,0.18)",
          letterSpacing: "-0.01em",
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
          background: "rgba(255,255,255,0.85)",
          border: "1.5px solid rgba(0,0,0,0.06)",
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
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(20px)",
        borderRadius: 24,
        border: "1.5px solid rgba(255,255,255,0.95)",
        boxShadow: "0 4px 28px rgba(0,0,0,0.07), inset 0 1px 1px rgba(255,255,255,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: value ? "flex-end" : "center",
        padding: "0 24px",
        marginBottom: 28,
      }}>
        <span style={{
          fontSize: value.length > 8 ? 28 : value.length > 5 ? 36 : 44,
          fontWeight: 800,
          color: value ? "#2d3436" : "#dfe6e9",
          letterSpacing: "0.04em",
          fontVariantNumeric: "tabular-nums",
          transition: "font-size 0.15s, color 0.15s",
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
