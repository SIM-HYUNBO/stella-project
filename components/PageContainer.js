"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "/components/Header";
import AppLock from "@/components/AppLock";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const NAV_ITEMS = [
  {
    label: "홈",
    path: "/home",
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
        <polyline points="9 21 9 12 15 12 15 21" />
      </svg>
    ),
  },
  {
    label: "채팅",
    path: "/avatar",
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "단체채팅",
    path: "/groupchat",
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
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
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

const PageContainer = ({ children }) => {
  const [ripples, setRipples] = useState([]);
  const [locked, setLocked] = useState(false);
  const [isWagi, setIsWagi] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) setIsWagi(snap.data().isWagi === true);
    });
    return () => unsub();
  }, []);

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
      className="relative flex w-full min-h-screen justify-center [overflow-x:clip]"
      style={{ background: "#f0f9ff" }}
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
      {/* 배경 블롭 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full blur-3xl opacity-40" style={{ background: "#bae6fd" }}/>
        <div className="absolute top-1/3 -right-16 w-56 h-56 rounded-full blur-3xl opacity-30" style={{ background: "#e0f2fe" }}/>
        <div className="absolute -bottom-12 left-1/3 w-48 h-48 rounded-full blur-3xl opacity-30" style={{ background: "#dbeafe" }}/>
      </div>

      <div className="flex flex-col w-full max-w-4xl relative pb-12 pt-[60px] z-10">
        <Header />

        <main className="w-full p-4 relative z-10">
          {children}
        </main>
      </div>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 h-[58px] shadow-[0_-2px_20px_rgba(14,165,233,0.08)] flex justify-center">
        <div className="flex items-center justify-around w-full max-w-4xl px-1">
          {NAV_ITEMS.map(({ label, path, icon }) => {
            const active = pathname === path || pathname?.startsWith(path + "/");
            return (
              <button
                key={path}
                onClick={() => router.push(path)}
                className={`flex items-center justify-center flex-1 h-[58px] transition-all duration-150 ${active ? "text-sky-500" : "text-gray-400 hover:text-gray-500"}`}
              >
                {icon(active)}
              </button>
            );
          })}
          {isWagi && (
            <button
              onClick={() => router.push("/wagi")}
              className={`flex items-center justify-center flex-1 h-[58px] transition-all duration-150 ${pathname === "/wagi" ? "text-purple-500" : "text-purple-300 hover:text-purple-400"}`}
            >
              <span style={{ fontSize: pathname === "/wagi" ? 24 : 22, lineHeight: 1 }}>🔒</span>
            </button>
          )}
        </div>
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