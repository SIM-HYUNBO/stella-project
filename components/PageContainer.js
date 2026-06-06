"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "/components/Header";
import AppLock from "@/components/AppLock";

const NAV_ITEMS = [
  {
    label: "홈",
    path: "/home",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
        <polyline points="9 21 9 12 15 12 15 21" />
      </svg>
    ),
  },
  {
    label: "채팅",
    path: "/avatar",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "단체채팅",
    path: "/groupchat",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "친구",
    path: "/friendmenu",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "다이어리",
    path: "/diary",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    label: "캘린더",
    path: "/calendar",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill={active ? "currentColor" : "none"} />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        {active && <><rect x="7" y="14" width="3" height="3" rx="0.5" fill="white" stroke="none"/><rect x="14" y="14" width="3" height="3" rx="0.5" fill="white" stroke="none"/></>}
      </svg>
    ),
  },
];

const PageContainer = ({ children }) => {
  const [ripples, setRipples] = useState([]);
  const [locked, setLocked] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const enabled = localStorage.getItem("appLockEnabled") === "true";
    const unlocked = sessionStorage.getItem("appLockUnlocked") === "true";
    if (enabled && !unlocked) setLocked(true);
  }, []);

  const createRipple = (clientX, clientY) => {
    const id = Date.now() + Math.random();

    setRipples((prev) => [
      ...prev,
      {
        id,
        x: clientX,
        y: clientY,
      },
    ]);

    setTimeout(() => {
      setRipples((prev) =>
        prev.filter((r) => r.id !== id)
      );
    }, 900);
  };

  if (locked) return <AppLock onUnlock={() => setLocked(false)} />;

  return (
    <div
      className="relative flex w-full min-h-screen overflow-x-hidden"
      onClick={(e) =>
        createRipple(e.clientX, e.clientY)
      }
      onTouchStart={(e) => {
        const touch = e.touches[0];

        if (!touch) return;

        createRipple(
          touch.clientX,
          touch.clientY
        );
      }}
    >
      <div className="flex-1 w-full relative pb-12">
        <Header />

        <main className="w-full p-4 relative z-10">
          {children}
        </main>
      </div>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white flex items-center justify-around px-2 h-12">
        {NAV_ITEMS.map(({ label, path, icon }) => {
          const active = pathname === path || pathname?.startsWith(path + "/");
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={`flex items-center justify-center flex-1 h-full transition-colors ${active ? "text-sky-400" : "text-gray-400"}`}
            >
              {icon(active)}
            </button>
          );
        })}
      </nav>

      {/* 파동 레이어 */}
      <div className="pointer-events-none fixed inset-0 z-[9999]">
        {ripples.map((r) => (
          <span
            key={r.id}
            className="screen-ripple"
            style={{
              left: r.x,
              top: r.y,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        .screen-ripple {
          position: fixed;

          width: 20px;
          height: 20px;

          border-radius: 9999px;

          border: 2px solid
            rgba(255, 255, 255, 0.75);

          transform: translate(-50%, -50%);

          animation: ripple 0.9s ease-out
            forwards;

          box-shadow:
            0 0 18px
              rgba(
                255,
                255,
                255,
                0.45
              ),
            0 0 40px
              rgba(
                255,
                255,
                255,
                0.2
              );
        }

        @keyframes ripple {
          0% {
            width: 10px;
            height: 10px;

            opacity: 0.95;
          }

          100% {
            width: 180px;
            height: 180px;

            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default PageContainer;