"use client";

import { useState } from "react";

interface Props {
  onUnlock: () => void;
}

export default function AppLock({ onUnlock }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const stored = typeof window !== "undefined" ? localStorage.getItem("appLockPin") || "" : "";

  const press = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(false);

    if (next.length === 4) {
      setTimeout(() => {
        if (next === stored) {
          sessionStorage.setItem("appLockUnlocked", "true");
          onUnlock();
        } else {
          setShake(true);
          setError(true);
          setTimeout(() => { setPin(""); setShake(false); }, 600);
        }
      }, 100);
    }
  };

  const del = () => { setPin((p) => p.slice(0, -1)); setError(false); };

  const dots = [0, 1, 2, 3];
  const keys = ["1","2","3","4","5","6","7","8","9","","0","←"];

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-gradient-to-b from-orange-50 to-amber-50">
      <div className="text-5xl mb-6">🔒</div>
      <div className="text-xl font-black text-[#3d1f00] mb-2">앱 비밀번호</div>
      <div className="text-sm text-gray-400 mb-8">4자리 PIN을 입력하세요</div>

      <div className={`flex gap-4 mb-10 ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
        {dots.map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-colors ${
              i < pin.length
                ? error ? "bg-red-400 border-red-400" : "bg-orange-400 border-orange-400"
                : "border-gray-300 bg-transparent"
            }`}
          />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm font-bold mb-4 -mt-6">잘못된 비밀번호입니다</p>}

      <div className="grid grid-cols-3 gap-3 w-64">
        {keys.map((k, i) => (
          k === "" ? <div key={i} /> :
          k === "←" ? (
            <button
              key={i}
              onClick={del}
              className="h-16 rounded-2xl bg-white border border-gray-100 shadow-sm text-2xl text-gray-500 flex items-center justify-center active:scale-95 transition"
            >
              ←
            </button>
          ) : (
            <button
              key={i}
              onClick={() => press(k)}
              className="h-16 rounded-2xl bg-white border border-gray-100 shadow-sm text-2xl font-black text-[#3d1f00] flex items-center justify-center active:scale-95 transition active:bg-orange-50"
            >
              {k}
            </button>
          )
        ))}
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
