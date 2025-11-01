// components/DotSpinner.tsx
export default function DotSpinner() {
  return (
    <div className="fixed inset-0 flex justify-center items-center z-50 pointer-events-none">
      <div className="relative w-24 h-24">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 bg-blue-500 rounded-full"
            style={{
              top: "50%",
              left: "50%",
              margin: "-8px 0 0 -8px",
              transform: `rotate(${i * 45}deg) translate(40px)`,
              transformOrigin: "center center",
              animation: `dot-spin 1.6s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes dot-spin {
          0% {
            transform: rotate(0deg) translate(40px) scale(0.5);
            opacity: 0.3;
          }
          50% {
            transform: rotate(180deg) translate(0px) scale(1.2);
            opacity: 1;
          }
          100% {
            transform: rotate(360deg) translate(40px) scale(0.5);
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}
