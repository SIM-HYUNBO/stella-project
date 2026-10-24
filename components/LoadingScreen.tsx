"use client";

export default function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3"
      style={{
        paddingTop: "60px",
        paddingBottom: "58px",
        background: "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <img
        src="/wag.png"
        alt="loading"
        style={{
          width: 72,
          height: 72,
          objectFit: "contain",
          animation: "wagBounce 0.65s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite",
        }}
      />
      <div
        style={{
          width: 28,
          height: 7,
          borderRadius: 9999,
          background: "rgba(14, 165, 233, 0.28)",
          animation: "wagShadow 0.65s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite",
        }}
      />
      <style>{`
        @keyframes wagBounce {
          0%, 100% {
            transform: translateY(0) scaleX(1) scaleY(1);
            animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
          }
          50% {
            transform: translateY(-28px) scaleX(0.92) scaleY(1.08);
            animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
          }
        }
        @keyframes wagShadow {
          0%, 100% {
            transform: scaleX(1);
            opacity: 0.28;
          }
          50% {
            transform: scaleX(0.45);
            opacity: 0.10;
          }
        }
      `}</style>
    </div>
  );
}
