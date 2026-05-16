"use client";

import { useEffect, useRef, useState } from "react";

export default function ARGlassOrbPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [smile, setSmile] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setReady(true);
        }
      } catch {
        alert("카메라 권한을 허용해줘!");
      }
    };

    startCamera();

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const pet = () => {
    setSmile(true);
    setTimeout(() => setSmile(false), 900);
  };

  return (
    <div className="page">
      <video ref={videoRef} autoPlay playsInline muted className="camera" />

      {!ready && <div className="loading">카메라 켜는 중...</div>}

      <div className={`flight ${paused ? "paused" : ""}`}>
        <div className="orb-shadow" />

        <div
          className="orb"
          onClick={() => setPaused((prev) => !prev)}
          onMouseMove={pet}
          onTouchMove={pet}
        >
          {Array.from({ length: 26 }).map((_, i) => (
            <span
              key={i}
              className="glitter"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53) % 100}%`,
                animationDelay: `${i * 0.17}s`,
              }}
            />
          ))}

          <div className="lens" />
          <div className="shine big" />
          <div className="shine small" />

          <div className="face">
            <div className={`eye left ${smile ? "smile" : ""}`} />
            <div className={`eye right ${smile ? "smile" : ""}`} />
            <div className={`mouth ${smile ? "happy" : ""}`} />
          </div>

          {smile && <div className="bubble">헤헤...</div>}
        </div>
      </div>

      <style jsx>{`
        .page {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: #000;
        }

        .camera {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: contrast(1.04) saturate(1.05);
        }

        .loading {
          position: absolute;
          inset: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
          font-weight: 900;
          background: rgba(0, 0, 0, 0.45);
        }

        .flight {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 5;
          width: 1px;
          height: 1px;
          perspective: 900px;
          animation: flyPath 13s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        .flight.paused {
          animation-play-state: paused;
        }

        .flight.paused .orb,
        .flight.paused .orb-shadow,
        .flight.paused .glitter {
          animation-play-state: paused;
        }

        .orb {
          position: absolute;
          left: 0;
          top: 0;
          width: 170px;
          height: 170px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          overflow: hidden;
          touch-action: none;
          cursor: pointer;

          background:
            radial-gradient(circle at 28% 20%, rgba(255,255,255,0.95), rgba(255,255,255,0.26) 16%, transparent 34%),
            radial-gradient(circle at 65% 78%, rgba(255,220,125,0.42), transparent 34%),
            radial-gradient(circle at 38% 64%, rgba(155,124,255,0.84), transparent 43%),
            linear-gradient(145deg, rgba(255,255,255,0.43), rgba(130,95,235,0.64));

          box-shadow:
            0 18px 50px rgba(120, 90, 210, 0.35),
            inset 16px 18px 32px rgba(255,255,255,0.58),
            inset -18px -24px 42px rgba(38,28,100,0.4);

          backdrop-filter: blur(8px) saturate(1.35);
          -webkit-backdrop-filter: blur(8px) saturate(1.35);

          opacity: 0.96;
          animation: hoverBody 4.2s ease-in-out infinite;
        }

        .orb::before {
          content: "";
          position: absolute;
          inset: 10px;
          border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,0.42);
          z-index: 6;
          pointer-events: none;
        }

        .orb-shadow {
          position: absolute;
          left: 0;
          top: 105px;
          width: 120px;
          height: 28px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.28);
          filter: blur(14px);
          animation: shadowFloat 13s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        .lens {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 110%, rgba(0,0,0,0.16), transparent 42%),
            radial-gradient(circle at 18% 42%, rgba(255,255,255,0.26), transparent 28%),
            linear-gradient(100deg, rgba(255,255,255,0.12), transparent 45%, rgba(0,0,0,0.08));
          z-index: 3;
          pointer-events: none;
        }

        .glitter {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(255,255,255,0.9);
          box-shadow:
            0 0 8px rgba(255,255,255,0.95),
            0 0 18px rgba(255,255,255,0.55);
          z-index: 2;
          animation: glitter 5.5s ease-in-out infinite;
        }

        .shine {
          position: absolute;
          z-index: 8;
          border-radius: 50%;
          background: rgba(255,255,255,0.82);
        }

        .shine.big {
          top: 25px;
          left: 39px;
          width: 42px;
          height: 20px;
          transform: rotate(-34deg);
        }

        .shine.small {
          top: 56px;
          left: 27px;
          width: 16px;
          height: 10px;
        }

        .face {
          position: absolute;
          inset: 0;
          z-index: 9;
        }

        .eye {
          position: absolute;
          top: 72px;
          width: 14px;
          height: 20px;
          border-radius: 50%;
          background: rgba(48, 38, 68, 0.9);
          transition: 0.18s ease;
        }

        .eye.left {
          left: 58px;
        }

        .eye.right {
          right: 58px;
        }

        .eye.smile {
          top: 80px;
          height: 7px;
          border-radius: 0 0 18px 18px;
        }

        .mouth {
          position: absolute;
          left: 50%;
          top: 102px;
          width: 22px;
          height: 10px;
          transform: translateX(-50%);
          border-bottom: 4px solid rgba(48, 38, 68, 0.82);
          border-radius: 0 0 18px 18px;
          transition: 0.18s ease;
        }

        .mouth.happy {
          width: 30px;
          height: 14px;
        }

        .bubble {
          position: absolute;
          top: -34px;
          left: 50%;
          z-index: 20;
          transform: translateX(-50%);
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.88);
          color: #7658e8;
          font-weight: 900;
          white-space: nowrap;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
          animation: pop 0.9s ease forwards;
        }

        @keyframes flyPath {
          0% {
            transform: translate(-32vw, 22vh) scale(0.72) rotateZ(-8deg);
          }

          12% {
            transform: translate(-22vw, 8vh) scale(0.86) rotateZ(4deg);
          }

          26% {
            transform: translate(18vw, -18vh) scale(1.04) rotateZ(8deg);
          }

          38% {
            transform: translate(30vw, -6vh) scale(0.92) rotateZ(-4deg);
          }

          52% {
            transform: translate(10vw, 18vh) scale(1.18) rotateZ(3deg);
          }

          64% {
            transform: translate(-8vw, 4vh) scale(1) rotateZ(-2deg);
          }

          78% {
            transform: translate(-28vw, -14vh) scale(0.82) rotateZ(7deg);
          }

          100% {
            transform: translate(-32vw, 22vh) scale(0.72) rotateZ(-8deg);
          }
        }

        @keyframes hoverBody {
          0%, 100% {
            transform: translate(-50%, -50%) translateY(0) scale(1);
            filter: brightness(1);
          }

          45% {
            transform: translate(-50%, -50%) translateY(-8px) scale(1.035);
            filter: brightness(1.08);
          }

          70% {
            transform: translate(-50%, -50%) translateY(2px) scale(0.99);
            filter: brightness(0.98);
          }
        }

        @keyframes shadowFloat {
          0% {
            transform: translate(-50%, -50%) scale(0.72);
            opacity: 0.16;
          }

          26% {
            transform: translate(-50%, -50%) scale(0.92);
            opacity: 0.24;
          }

          52% {
            transform: translate(-50%, -50%) scale(1.18);
            opacity: 0.32;
          }

          78% {
            transform: translate(-50%, -50%) scale(0.82);
            opacity: 0.2;
          }

          100% {
            transform: translate(-50%, -50%) scale(0.72);
            opacity: 0.16;
          }
        }

        @keyframes glitter {
          0%, 100% {
            transform: translate(0, 0) scale(0.75);
            opacity: 0.3;
          }

          30% {
            transform: translate(7px, -10px) scale(1.1);
            opacity: 0.8;
          }

          60% {
            transform: translate(-5px, -18px) scale(1.3);
            opacity: 1;
          }
        }

        @keyframes pop {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(8px) scale(0.8);
          }

          30% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1.05);
          }

          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px) scale(1);
          }
        }
      `}</style>
    </div>
  );
}