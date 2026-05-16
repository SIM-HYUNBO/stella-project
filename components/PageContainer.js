"use client";

// PageContainer.js

import { useState } from "react";
import Header from "/components/Header";

const PageContainer = ({ children }) => {
  const [ripples, setRipples] = useState([]);

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

  return (
    <div
      className="relative flex w-full min-h-screen overflow-hidden"
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
      <div className="flex-1 w-full relative">
        <Header />

        <main className="w-full p-4 relative z-10">
          {children}
        </main>
      </div>

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