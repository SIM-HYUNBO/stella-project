"use client";

import { useEffect, useState } from "react";

export default function GlobalCursor() {
  const [pos, setPos] = useState({ x: -200, y: -200 });
  const [trail, setTrail] = useState({ x: -200, y: -200 });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(localStorage.getItem("stellaAdminMode") === "true");

    const move = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setTimeout(() => setTrail({ x: e.clientX, y: e.clientY }), 80);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  if (isAdmin) return null;

  return (
    <>
      <div
        className="fixed pointer-events-none z-[9999]"
        style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
      >
        <div className="w-3 h-3 rounded-full bg-yellow-50 border-2 border-sky-400 shadow-[0_0_6px_2px_rgba(56,189,248,0.5)]" />
      </div>
      <div
        className="fixed pointer-events-none z-[9998] transition-[left,top] ease-out duration-[80ms]"
        style={{ left: trail.x, top: trail.y, transform: "translate(-50%, -50%)" }}
      >
        <div className="w-8 h-8 rounded-full border border-sky-300/60 bg-yellow-100/10" />
      </div>
    </>
  );
}
