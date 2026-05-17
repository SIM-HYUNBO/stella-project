"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ARPhotoPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);

  const [ready, setReady] = useState(false);
  const [pose, setPose] = useState<"normal" | "cute" | "wink" | "happy">(
    "normal"
  );
  const [flash, setFlash] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");

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

  const changePose = () => {
    const poses: typeof pose[] = ["normal", "cute", "wink", "happy"];
    const current = poses.indexOf(pose);
    setPose(poses[(current + 1) % poses.length]);
  };

  const takePhoto = async () => {
    if (!videoRef.current) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 180);

    const video = videoRef.current;
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth || window.innerWidth;
    canvas.height = video.videoHeight || window.innerHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const orbSize = canvas.width * 0.28;
    const orbX = canvas.width * 0.5 - orbSize / 2;
    const orbY = canvas.height * 0.58 - orbSize / 2;

    const gradient = ctx.createRadialGradient(
      orbX + orbSize * 0.32,
      orbY + orbSize * 0.25,
      orbSize * 0.05,
      orbX + orbSize * 0.5,
      orbY + orbSize * 0.5,
      orbSize * 0.55
    );

    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.28, "rgba(210,190,255,0.75)");
    gradient.addColorStop(1, "rgba(120,90,230,0.82)");

    ctx.save();

    ctx.shadowColor = "rgba(80,60,160,0.45)";
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(orbX + orbSize / 2, orbY + orbSize / 2, orbSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(orbX + orbSize / 2, orbY + orbSize / 2, orbSize / 2 - 8, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.ellipse(
      orbX + orbSize * 0.32,
      orbY + orbSize * 0.24,
      orbSize * 0.14,
      orbSize * 0.07,
      -0.55,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "rgba(50,40,70,0.9)";

    const eyeY = orbY + orbSize * 0.45;
    const leftEyeX = orbX + orbSize * 0.38;
    const rightEyeX = orbX + orbSize * 0.62;

    if (pose === "wink") {
      ctx.beginPath();
      ctx.ellipse(leftEyeX, eyeY, orbSize * 0.035, orbSize * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(rightEyeX - orbSize * 0.04, eyeY);
      ctx.lineTo(rightEyeX + orbSize * 0.04, eyeY);
      ctx.strokeStyle = "rgba(50,40,70,0.9)";
      ctx.stroke();
    } else if (pose === "happy" || pose === "cute") {
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, orbSize * 0.045, 0, Math.PI);
      ctx.strokeStyle = "rgba(50,40,70,0.9)";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rightEyeX, eyeY, orbSize * 0.045, 0, Math.PI);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(leftEyeX, eyeY, orbSize * 0.035, orbSize * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(rightEyeX, eyeY, orbSize * 0.035, orbSize * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(
      orbX + orbSize * 0.5,
      orbY + orbSize * 0.59,
      pose === "happy" ? orbSize * 0.08 : orbSize * 0.06,
      0,
      Math.PI
    );
    ctx.strokeStyle = "rgba(50,40,70,0.82)";
    ctx.stroke();

    if (pose === "cute") {
      ctx.fillStyle = "rgba(255,130,180,0.55)";
      ctx.beginPath();
      ctx.ellipse(orbX + orbSize * 0.28, orbY + orbSize * 0.56, orbSize * 0.08, orbSize * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(orbX + orbSize * 0.72, orbY + orbSize * 0.56, orbSize * 0.08, orbSize * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    const url = canvas.toDataURL("image/png");
    setPhotoUrl(url);
  };

  return (
    <div className="page" ref={captureRef}>
      <button
        onClick={() => router.back()}
        style={{
          position: "fixed", top: 16, left: 16, zIndex: 100,
          background: "rgba(255,255,255,0.8)", border: "none",
          borderRadius: 12, padding: "6px 14px", fontSize: 14,
          fontWeight: 600, cursor: "pointer", backdropFilter: "blur(6px)",
        }}
      >
        ← 뒤로
      </button>
      <video ref={videoRef} autoPlay playsInline muted className="camera" />

      {!ready && <div className="loading">카메라 켜는 중...</div>}

      <div className={`orb ${pose}`} onClick={changePose}>
        <span className="glitter g1" />
        <span className="glitter g2" />
        <span className="glitter g3" />

        <div className="shine big" />
        <div className="shine small" />

        <div className="face">
          <div className="eye left" />
          <div className="eye right" />
          <div className="mouth" />
          {pose === "cute" && (
            <>
              <div className="cheek left-cheek" />
              <div className="cheek right-cheek" />
            </>
          )}
        </div>

        <div className="pose-text">찰칵 포즈!</div>
      </div>

      <button className="pose-btn" onClick={changePose}>
        포즈 바꾸기
      </button>

      <button className="shoot-btn" onClick={takePhoto}>
        📸 사진 찍기
      </button>

      {flash && <div className="flash" />}

      {photoUrl && (
        <div className="preview">
          <img src={photoUrl} alt="찍은 사진" />
          <a href={photoUrl} download="wagie-orb-photo.png">
            저장하기
          </a>
          <button onClick={() => setPhotoUrl("")}>닫기</button>
        </div>
      )}

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
          background: rgba(0, 0, 0, 0.45);
        }

        .orb {
          position: absolute;
          left: 50%;
          top: 58%;
          width: 180px;
          height: 180px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          overflow: visible;
          cursor: pointer;
          touch-action: none;
          background:
            radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95), rgba(255,255,255,0.24) 18%, transparent 35%),
            radial-gradient(circle at 35% 65%, rgba(155,124,255,0.94), transparent 42%),
            linear-gradient(145deg, rgba(255,255,255,0.55), rgba(155,124,255,0.82));
          box-shadow:
            0 20px 60px rgba(120, 90, 210, 0.45),
            inset 18px 18px 35px rgba(255,255,255,0.68),
            inset -20px -24px 40px rgba(70,45,160,0.38);
          animation: poseFloat 3s ease-in-out infinite;
        }

        .orb::before {
          content: "";
          position: absolute;
          inset: 10px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.42);
        }

        .orb.cute {
          transform: translate(-50%, -50%) rotate(-4deg) scale(1.03);
        }

        .orb.wink {
          transform: translate(-50%, -50%) rotate(5deg);
        }

        .orb.happy {
          transform: translate(-50%, -50%) scale(1.08);
        }

        .glitter {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 0 12px white;
          animation: glitter 3s ease-in-out infinite;
        }

        .g1 {
          left: 45px;
          top: 65px;
        }

        .g2 {
          right: 48px;
          top: 48px;
          animation-delay: 0.4s;
        }

        .g3 {
          left: 92px;
          bottom: 48px;
          animation-delay: 0.8s;
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
          background: rgba(50,40,70,0.9);
        }

        .eye.left {
          left: 62px;
        }

        .eye.right {
          right: 62px;
        }

        .wink .eye.right,
        .happy .eye,
        .cute .eye {
          height: 7px;
          top: 84px;
          border-radius: 0 0 18px 18px;
        }

        .wink .eye.right {
          transform: rotate(-8deg);
        }

        .mouth {
          position: absolute;
          left: 50%;
          top: 108px;
          width: 24px;
          height: 10px;
          transform: translateX(-50%);
          border-bottom: 4px solid rgba(50,40,70,0.85);
          border-radius: 0 0 20px 20px;
        }

        .happy .mouth,
        .cute .mouth {
          width: 32px;
          height: 15px;
        }

        .cheek {
          position: absolute;
          top: 102px;
          width: 28px;
          height: 12px;
          border-radius: 50%;
          background: rgba(255,120,170,0.55);
          filter: blur(1px);
        }

        .left-cheek {
          left: 35px;
        }

        .right-cheek {
          right: 35px;
        }

        .pose-text {
          position: absolute;
          top: -34px;
          left: 50%;
          transform: translateX(-50%);
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.9);
          color: #7658e8;
          font-weight: 900;
          white-space: nowrap;
        }

        .pose-btn,
        .shoot-btn {
          position: fixed;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          width: 170px;
          border: none;
          border-radius: 999px;
          padding: 13px 16px;
          color: white;
          font-weight: 900;
          box-shadow: 0 10px 30px rgba(0,0,0,0.28);
        }

        .pose-btn {
          bottom: 88px;
          background: rgba(255,255,255,0.24);
          backdrop-filter: blur(12px);
        }

        .shoot-btn {
          bottom: 28px;
          background: #7b5cff;
        }

        .flash {
          position: fixed;
          inset: 0;
          z-index: 30;
          background: white;
          animation: flash 0.18s ease forwards;
        }

        .preview {
          position: fixed;
          inset: 0;
          z-index: 40;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          background: rgba(0,0,0,0.78);
          padding: 20px;
        }

        .preview img {
          max-width: 90vw;
          max-height: 70vh;
          border-radius: 24px;
        }

        .preview a,
        .preview button {
          width: 180px;
          text-align: center;
          border: none;
          border-radius: 999px;
          padding: 12px;
          background: white;
          color: #7658e8;
          font-weight: 900;
          text-decoration: none;
        }

        @keyframes poseFloat {
          0%, 100% {
            margin-top: 0;
          }
          50% {
            margin-top: -10px;
          }
        }

        @keyframes glitter {
          0%, 100% {
            opacity: 0.35;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
          }
        }

        @keyframes flash {
          from {
            opacity: 0.95;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}