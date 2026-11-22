"use client";
import { useEffect, useState } from "react";

export default function LockedPage() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = window.setTimeout(() => setVisible(true), 800);
    const hide = window.setTimeout(() => setVisible(false), 1800);
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, []);
  return <main aria-label="비밀 페이지" className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
    <p role="status" className={`px-6 text-center text-lg font-medium text-slate-700 transition-all duration-150 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
      {visible ? "쉿! 비밀 화면 진입 성공!" : ""}
    </p>
  </main>;
}
