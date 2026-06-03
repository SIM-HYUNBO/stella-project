import Link from "next/link";
import { Jua } from 'next/font/google';

const jua = Jua({ weight: "400", subsets: ["latin"] });

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-300 via-amber-200 to-yellow-200" />
      <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.18)_50%,transparent_60%)] animate-[shimmer_4s_infinite]" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/20" />

      <div className="relative flex justify-between items-center px-5 py-3">
        <Link href="/home" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-[12px] bg-white/25 backdrop-blur-sm flex items-center justify-center shadow-inner text-xl">
            💬
          </div>
          <span className={`${jua.className} text-[28px] text-white drop-shadow-sm tracking-wide`}>
            WAGIE
          </span>
        </Link>

        <Link href="/tools"
          className="w-9 h-9 rounded-[12px] bg-white/25 backdrop-blur-sm flex items-center justify-center shadow-inner active:scale-90 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </header>
  );
};

export default Header;
