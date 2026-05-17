"use client";

import { useEffect, useRef, useState } from "react";
import PageContainer from "@/components/PageContainer";

const GLITTERS = Array.from({ length: 22 }).map((_, i) => ({
  id: i,
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  size: 3 + (i % 4),
  delay: (i % 7) * 0.4,
  duration: 4 + (i % 5),
}));

export default function AvatarPage() {
  const orbRef = useRef<HTMLDivElement | null>(null);

  const lastMoveRef = useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);

  const [name, setName] = useState("말랑구슬");
  const [mood, setMood] = useState(65);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reaction, setReaction] = useState("");
  const [dizzy, setDizzy] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const [msgBuzz, setMsgBuzz] = useState(false);
  const [msgFrom, setMsgFrom] = useState("");

  const moodType =
    mood >= 80
      ? "happy"
      : mood >= 55
      ? "normal"
      : mood >= 30
      ? "sad"
      : "angry";

  const moodText = dizzy
    ? "어지러워..."
    : moodType === "happy"
    ? "기분 최고야"
    : moodType === "normal"
    ? "말랑말랑해"
    : moodType === "sad"
    ? "조금 외로워..."
    : "삐졌어";

  const orbColor =
    moodType === "happy"
      ? "#ffd86b"
      : moodType === "normal"
      ? "#9b7cff"
      : moodType === "sad"
      ? "#7ddcff"
      : "#ff5b6e";

  useEffect(() => {
    const savedName = localStorage.getItem("orbName");
    const savedMood = localStorage.getItem("orbMood");

    if (savedName) setName(savedName);
    if (savedMood) setMood(Number(savedMood));
  }, []);

  const saveSettings = () => {
    localStorage.setItem("orbName", name);
    localStorage.setItem("orbMood", String(mood));

    alert("저장됐어!");
  };

  const changeMood = (amount: number, text: string) => {
    setMood((prev) => {
      const next = Math.max(0, Math.min(100, prev + amount));

      localStorage.setItem("orbMood", String(next));

      return next;
    });

    setReaction(text);

    setTimeout(() => {
      setReaction("");
    }, 1200);
  };

  /* =========================
      파동 생성
  ========================= */
 

 

  /* =========================
      쓰다듬기
  ========================= */
  const handlePetMove = (
    clientX: number,
    clientY: number
  ) => {
    const now = Date.now();

    

    if (!lastMoveRef.current) {
      lastMoveRef.current = {
        x: clientX,
        y: clientY,
        time: now,
      };

      return;
    }

    const dx =
      clientX - lastMoveRef.current.x;

    const dy =
      clientY - lastMoveRef.current.y;

    const dt = Math.max(
      now - lastMoveRef.current.time,
      1
    );

    const speed =
      Math.sqrt(dx * dx + dy * dy) / dt;

    lastMoveRef.current = {
      x: clientX,
      y: clientY,
      time: now,
    };

    if (speed > 1.2) {
      changeMood(-2, "아야!");
    } else if (speed > 0.08) {
      changeMood(1, "좋아...");
    }
  };

  const handleMousePet = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    handlePetMove(e.clientX, e.clientY);
  };

  const handleTouchPet = (
    e: React.TouchEvent<HTMLDivElement>
  ) => {
    const touch = e.touches[0];

    if (!touch) return;

    handlePetMove(
      touch.clientX,
      touch.clientY
    );
  };

  /* =========================
      멀미
  ========================= */
  const startDizzy = () => {
    if (dizzy) return;

    setDizzy(true);

    setReaction("우웅...");

    setMood((prev) => {
      const next = Math.max(0, prev - 3);

      localStorage.setItem(
        "orbMood",
        String(next)
      );

      return next;
    });

    setTimeout(() => {
      setDizzy(false);
    }, 2600);

    setTimeout(() => {
      setReaction("");
    }, 1400);
  };

  const enableMotion = async () => {
    const DeviceMotion =
      DeviceMotionEvent as typeof DeviceMotionEvent & {
        requestPermission?: () => Promise<PermissionState>;
      };

    if (
      typeof DeviceMotion?.requestPermission ===
      "function"
    ) {
      const permission =
        await DeviceMotion.requestPermission();

      if (permission !== "granted") {
        alert("권한이 필요해!");
        return;
      }
    }

    setMotionReady(true);

    alert("흔들기 감지 켜졌어!");
  };

  useEffect(() => {
    if (!motionReady) return;

    let lastShakeTime = 0;

    const handleMotion = (
      event: DeviceMotionEvent
    ) => {
      const acc =
        event.accelerationIncludingGravity;

      if (!acc) return;

      const total =
        Math.abs(acc.x || 0) +
        Math.abs(acc.y || 0) +
        Math.abs(acc.z || 0);

      const now = Date.now();

      if (
        total > 45 &&
        now - lastShakeTime > 2500
      ) {
        lastShakeTime = now;

        startDizzy();
      }
    };

    window.addEventListener(
      "devicemotion",
      handleMotion
    );

    return () => {
      window.removeEventListener(
        "devicemotion",
        handleMotion
      );
    };
  }, [motionReady, dizzy]);

  /* =========================
      새 메시지 반응
  ========================= */
  useEffect(() => {
    const handler = (e: any) => {
      const { title } = e.detail ?? {};
      setMsgFrom(title ?? "누가 말 걸었어!");
      setMsgBuzz(true);
      changeMood(5, "💬 메시지 왔어!");
      setTimeout(() => {
        setMsgBuzz(false);
        setMsgFrom("");
      }, 2000);
    };
    window.addEventListener("newChatMessage", handler);
    return () => window.removeEventListener("newChatMessage", handler);
  }, []);

  /* =========================
      외로움 감소
  ========================= */
  useEffect(() => {
    const timer = setInterval(() => {
      setMood((prev) => {
        const next = Math.max(0, prev - 1);

        localStorage.setItem(
          "orbMood",
          String(next)
        );

        return next;
      });
    }, 25000);

    return () => clearInterval(timer);
  }, []);

  /* =========================
      마우스 따라다니기
  ========================= */
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!orbRef.current || dizzy) return;

      const x =
        (e.clientX -
          window.innerWidth / 2) /
        50;

      const y =
        (e.clientY -
          window.innerHeight / 2) /
        50;

      orbRef.current.style.transform = `
        translate(${x}px, ${y}px)
        rotateY(${x * 1.2}deg)
        rotateX(${-y * 1.2}deg)
      `;
    };

    window.addEventListener(
      "mousemove",
      move
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        move
      );
    };
  }, [dizzy]);

  return (
    <PageContainer>
      <div className="page">
        {menuOpen && (
          <div className="menu">
            <div className="menu-title">
              ✨ 유리구슬 설정
            </div>

            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="구슬 이름"
              className="input"
            />

            <button
              className="save-btn"
              onClick={saveSettings}
            >
              저장
            </button>

            <button
              className="motion-btn"
              onClick={enableMotion}
            >
              폰 흔들기 감지 켜기
            </button>
          </div>
        )}

        <div className="orb-name">
          {name}
        </div>

        <div className="mood-text">
          {moodText}
        </div>

        <div className="orb-wrap">
          {reaction && (
            <div className="reaction">
              {reaction}
            </div>
          )}

          {msgFrom && (
            <div className="msg-bubble">
              {msgFrom}
            </div>
          )}

          <div
            ref={orbRef}
            className={`orb ${moodType} ${dizzy ? "dizzy" : ""} ${msgBuzz ? "msg-buzz" : ""}`}
            onClick={() =>
              setMenuOpen(!menuOpen)
            }
            onMouseMove={handleMousePet}
            onTouchMove={handleTouchPet}
            onTouchEnd={() => {
              lastMoveRef.current = null;
            }}
            style={{
              background: `
                radial-gradient(circle at 32% 25%, rgba(255,255,255,0.95), rgba(255,255,255,0.25) 18%, transparent 32%),
                radial-gradient(circle at 65% 72%, rgba(255,255,255,0.28), transparent 28%),
                radial-gradient(circle at 35% 65%, ${orbColor}, transparent 38%),
                linear-gradient(145deg, rgba(255,255,255,0.65), ${orbColor})
              `,
              boxShadow: `
                0 35px 80px ${orbColor}77,
                inset 18px 18px 35px rgba(255,255,255,0.75),
                inset -25px -30px 45px rgba(105,70,210,0.35)
              `,
            }}
          >
            

            {/* 글리터 */}
            <div
              className={`glitter-layer ${
                dizzy
                  ? "dizzy-glitter"
                  : ""
              }`}
            >
              {GLITTERS.map((g) => (
                <span
                  key={g.id}
                  className="glitter"
                  style={{
                    left: `${g.left}%`,
                    top: `${g.top}%`,
                    width: `${g.size}px`,
                    height: `${g.size}px`,
                    animationDelay: `${g.delay}s`,
                    animationDuration: `${g.duration}s`,
                  }}
                />
              ))}
            </div>

            <div className="shine big" />
            <div className="shine small" />
            <div className="glow" />

            <div className="face">
              <div
                className={`eye left ${
                  dizzy
                    ? "dizzy-eye"
                    : ""
                }`}
              />

              <div
                className={`eye right ${
                  dizzy
                    ? "dizzy-eye"
                    : ""
                }`}
              />

              <div
                className={`mouth ${moodType} ${
                  dizzy
                    ? "dizzy-mouth"
                    : ""
                }`}
              />
            </div>
          </div>

          <div
            className="shadow"
            style={{
              background: `${orbColor}55`,
            }}
          />
        </div>

        <style jsx>{`
          .page {
            width: 100%;
            min-height: 100vh;

            overflow: hidden;

            position: relative;

            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;

            background:
              radial-gradient(
                circle at top,
                #fff6cf 0%,
                #ffd6ec 42%,
                #cdb9ff 100%
              );
          }

          .menu {
            position: absolute;

            top: 40px;
            right: 40px;

            z-index: 10;

            width: 260px;

            padding: 18px;

            border-radius: 28px;

            background: rgba(
              255,
              255,
              255,
              0.14
            );

            backdrop-filter: blur(18px);

            border: 1px solid
              rgba(
                255,
                255,
                255,
                0.22
              );

            color: white;
          }

          .menu-title {
            font-size: 18px;
            font-weight: 800;

            margin-bottom: 14px;
          }

          .input {
            width: 100%;

            border: none;
            outline: none;

            border-radius: 16px;

            padding: 12px 14px;

            margin-bottom: 16px;

            background: rgba(
              255,
              255,
              255,
              0.18
            );

            color: white;
          }

          .save-btn,
          .motion-btn {
            width: 100%;

            border: none;

            border-radius: 18px;

            padding: 12px;

            color: white;

            font-weight: 800;

            cursor: pointer;
          }

          .save-btn {
            margin-bottom: 10px;

            background: rgba(
              255,
              255,
              255,
              0.35
            );
          }

          .motion-btn {
            background: rgba(
              255,
              255,
              255,
              0.2
            );
          }

          .orb-name {
            font-size: 30px;
            font-weight: 900;

            color: white;
          }

          .mood-text {
            margin-top: 8px;
            margin-bottom: 24px;

            font-size: 15px;
            font-weight: 700;

            color: rgba(
              255,
              255,
              255,
              0.86
            );
          }

          .orb-wrap {
            position: relative;

            width: 260px;
            height: 300px;
          }

          .reaction {
            position: absolute;

            top: -18px;
            left: 50%;

            z-index: 8;

            transform: translateX(-50%);

            padding: 8px 14px;

            border-radius: 999px;

            background: rgba(
              255,
              255,
              255,
              0.85
            );

            color: #6d54d9;

            font-weight: 900;

            animation: pop 1.2s
              ease forwards;
          }

          .orb {
            position: absolute;

            top: 20px;
            left: 20px;

            width: 220px;
            height: 220px;

            border-radius: 50%;

            cursor: pointer;

            overflow: hidden;

            touch-action: none;

            transition:
              background 0.4s,
              box-shadow 0.4s,
              transform 0.18s
                ease-out;

            transform-style: preserve-3d;

            animation: float 3.2s
              ease-in-out infinite;
          }

          .ripple {
            position: absolute;

            width: 20px;
            height: 20px;

            border-radius: 50%;

            border: 2px solid
              rgba(
                255,
                255,
                255,
                0.7
              );

            transform: translate(
              -50%,
              -50%
            );

            pointer-events: none;

            animation: ripple 0.9s
              ease-out forwards;

            z-index: 2;
          }

          .glitter-layer {
            position: absolute;

            inset: 0;

            border-radius: 50%;

            overflow: hidden;

            z-index: 1;
          }

          .glitter {
            position: absolute;

            border-radius: 50%;

            background: rgba(
              255,
              255,
              255,
              0.88
            );

            box-shadow:
              0 0 8px
                rgba(
                  255,
                  255,
                  255,
                  0.95
                ),
              0 0 18px
                rgba(
                  255,
                  255,
                  255,
                  0.5
                );

            opacity: 0.75;

            animation-name: glitterFloat;
            animation-iteration-count: infinite;
            animation-timing-function: ease-in-out;
          }

          .glow {
            position: absolute;

            inset: -22px;

            border-radius: 50%;

            background:
              radial-gradient(
                circle,
                rgba(
                  255,
                  255,
                  255,
                  0.45
                ),
                transparent 65%
              );

            filter: blur(16px);

            z-index: 0;
          }

          .shine {
            position: absolute;

            z-index: 5;

            border-radius: 50%;

            background: rgba(
              255,
              255,
              255,
              0.82
            );
          }

          .shine.big {
            top: 38px;
            left: 52px;

            width: 48px;
            height: 24px;

            transform: rotate(-35deg);
          }

          .shine.small {
            top: 72px;
            left: 38px;

            width: 18px;
            height: 12px;
          }

          .face {
            position: absolute;

            inset: 0;

            z-index: 6;
          }

          .eye {
            position: absolute;

            top: 98px;

            width: 16px;
            height: 24px;

            border-radius: 50%;

            background: rgba(
              53,
              36,
              63,
              0.9
            );

            animation: blink 4s
              infinite;
          }

          .eye.left {
            left: 78px;
          }

          .eye.right {
            right: 78px;
          }

          .mouth {
            position: absolute;

            left: 50%;
            top: 132px;

            width: 24px;
            height: 12px;

            transform: translateX(-50%);
          }

          .mouth.happy,
          .mouth.normal {
            border-bottom: 4px solid
              rgba(
                53,
                36,
                63,
                0.85
              );

            border-radius: 0 0 24px
              24px;
          }

          .mouth.sad {
            border-top: 3px solid
              rgba(
                53,
                36,
                63,
                0.75
              );

            border-radius: 20px 20px
              0 0;
          }

          .mouth.angry {
            width: 18px;

            border-top: 3px solid
              rgba(
                53,
                36,
                63,
                0.9
              );
          }

          .shadow {
            position: absolute;

            bottom: 16px;
            left: 50%;

            width: 150px;
            height: 32px;

            transform: translateX(-50%);

            border-radius: 50%;

            filter: blur(10px);

            opacity: 0.5;

            animation: shadow 3.2s
              ease-in-out infinite;
          }

          @keyframes ripple {
            0% {
              width: 10px;
              height: 10px;

              opacity: 0.9;
            }

            100% {
              width: 140px;
              height: 140px;

              opacity: 0;
            }
          }

          @keyframes float {
            0%,
            100% {
              transform: translateY(0);
            }

            50% {
              transform: translateY(
                -14px
              );
            }
          }

          @keyframes glitterFloat {
            0% {
              transform: translate(
                  0,
                  0
                )
                scale(0.8);

              opacity: 0.35;
            }

            25% {
              transform: translate(
                  8px,
                  -12px
                )
                scale(1.2);

              opacity: 0.9;
            }

            50% {
              transform: translate(
                  -6px,
                  -22px
                )
                scale(1);

              opacity: 0.65;
            }

            75% {
              transform: translate(
                  10px,
                  -10px
                )
                scale(1.35);

              opacity: 1;
            }

            100% {
              transform: translate(
                  0,
                  0
                )
                scale(0.8);

              opacity: 0.35;
            }
          }

          @keyframes shadow {
            0%,
            100% {
              transform: translateX(
                  -50%
                )
                scale(1);
            }

            50% {
              transform: translateX(
                  -50%
                )
                scale(0.82);
            }
          }

          @keyframes blink {
            0%,
            92%,
            100% {
              transform: scaleY(1);
            }

            95% {
              transform: scaleY(0.2);
            }
          }

          .msg-buzz {
            animation: msgBuzz 0.6s ease forwards, float 3.2s ease-in-out infinite 0.6s !important;
            box-shadow:
              0 0 0 12px rgba(255, 220, 100, 0.35),
              0 0 0 24px rgba(255, 220, 100, 0.15),
              0 35px 80px var(--orb-color, #9b7cff77),
              inset 18px 18px 35px rgba(255,255,255,0.75),
              inset -25px -30px 45px rgba(105,70,210,0.35) !important;
          }

          .msg-bubble {
            position: absolute;
            top: -44px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10;
            padding: 8px 16px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.92);
            color: #7c54d9;
            font-weight: 900;
            font-size: 13px;
            white-space: nowrap;
            animation: pop 2s ease forwards;
            box-shadow: 0 4px 16px rgba(124, 84, 217, 0.2);
          }

          @keyframes msgBuzz {
            0%   { transform: scale(1) translateY(0); }
            20%  { transform: scale(1.12) translateY(-12px); }
            40%  { transform: scale(0.95) translateY(6px); }
            60%  { transform: scale(1.07) translateY(-8px); }
            80%  { transform: scale(0.98) translateY(3px); }
            100% { transform: scale(1) translateY(0); }
          }

          @keyframes pop {
            0% {
              opacity: 0;

              transform: translateX(
                  -50%
                )
                translateY(10px)
                scale(0.8);
            }

            30% {
              opacity: 1;

              transform: translateX(
                  -50%
                )
                translateY(0)
                scale(1.08);
            }

            100% {
              opacity: 0;

              transform: translateX(
                  -50%
                )
                translateY(-12px)
                scale(1);
            }
          }
        `}</style>
      </div>
    </PageContainer>
  );
}