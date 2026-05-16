"use client";

import { useEffect, useRef, useState } from "react";

export default function ARGlassOrbPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [smile, setSmile] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
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

  const petOrb = () => {
    setSmile(true);

    setTimeout(() => {
      setSmile(false);
    }, 1200);
  };

  return (
    <div className="page">
      <video ref={videoRef} autoPlay playsInline muted className="camera" />

      {!cameraReady && <div className="loading">카메라 켜는 중...</div>}

      <div className={`orb-path ${paused ? "paused" : ""}`}>
        <div
          className="orb"
          onClick={() => setPaused((prev) => !prev)}
          onMouseMove={petOrb}
          onTouchMove={petOrb}
        >
          {Array.from({ length: 22 }).map((_, i) => (
            <span
              key={i}
              className="glitter"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53) % 100}%`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}

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
          background: black;
        }

        .camera {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .loading {
          position: absolute;
          inset: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 900;
          font-size: 20px;
        }

        .orb-path {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 1px;
          height: 1px;
          z-index: 5;
          animation: movePath 10s ease-in-out infinite;
        }

        .orb-path.paused {
          animation-play-state: paused;
        }

        .orb {
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          overflow: visible;
          transform: translate(-50%, -50%);
          cursor: pointer;
          touch-action: none;
          backdrop-filter: blur(10px);

          background:
            radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95), rgba(255,255,255,0.2) 18%, transparent 35%),
            radial-gradient(circle at 35% 65%, rgba(155,124,255,0.95), transparent 40%),
            linear-gradient(145deg, rgba(255,255,255,0.6), rgba(155,124,255,0.85));

          box-shadow:
            0 20px 60px rgba(155,124,255,0.7),
            inset 18px 18px 35px rgba(255,255,255,0.7),
            inset -20px -24px 40px rgba(90,60,200,0.4);

          animation: breathe 3s ease-in-out infinite;
        }

        .orb::before {
          content: "";
          position: absolute;
          inset: 12px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.45);
          pointer-events: none;
        }

        .glitter {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(255,255,255,0.95);
          box-shadow:
            0 0 10px white,
            0 0 20px rgba(255,255,255,0.6);
          animation: glitter 5s ease-in-out infinite;
        }

        .shine {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.9);
        }

        .shine.big {
          top: 30px;
          left: 42px;
          width: 40px;
          height: 20px;
          transform: rotate(-35deg);
        }

        .shine.small {
          top: 60px;
          left: 28px;
          width: 16px;
          height: 10px;
        }

        .face {
          position: absolute;
          inset: 0;
          z-index: 3;
        }

        .eye {
          position: absolute;
          top: 78px;
          width: 14px;
          height: 20px;
          border-radius: 50%;
          background: rgba(50, 40, 70, 0.9);
          transition: 0.2s;
        }

        .eye.left {
          left: 62px;
        }

        .eye.right {
          right: 62px;
        }

        .eye.smile {
          height: 8px;
          top: 84px;
          border-radius: 0 0 20px 20px;
        }

        .mouth {
          position: absolute;
          left: 50%;
          top: 108px;
          width: 22px;
          height: 10px;
          transform: translateX(-50%);
          border-bottom: 4px solid rgba(50, 40, 70, 0.85);
          border-radius: 0 0 20px 20px;
          transition: 0.2s;
        }

        .mouth.happy {
          width: 30px;
          height: 14px;
        }

        .bubble {
          position: absolute;
          top: -34px;
          left: 50%;
          transform: translateX(-50%);
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.9);
          color: #7b5cff;
          font-weight: 900;
          white-space: nowrap;
          animation: pop 1.2s ease forwards;
        }

        @keyframes movePath {
          0% {
            transform: translate(-28vw, -18vh);
          }
          25% {
            transform: translate(22vw, -20vh);
          }
          50% {
            transform: translate(26vw, 12vh);
          }
          75% {
            transform: translate(-24vw, 18vh);
          }
          100% {
            transform: translate(-28vw, -18vh);
          }
        }

        @keyframes breathe {
          0%,
          100% {
            scale: 1;
          }
          50% {
            scale: 1.06;
          }
        }

        @keyframes glitter {
          0%,
          100% {
            transform: translateY(0) scale(0.8);
            opacity: 0.35;
          }
          50% {
            transform: translateY(-18px) scale(1.3);
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