import Link from "next/link";
import { Jua } from 'next/font/google';

const jua = Jua({ weight: "400", subsets: ["latin"] });

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white border-b border-gray-100" style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.06)" }}>
      <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.15)_50%,transparent_60%)] animate-[shimmer_4s_infinite]" />

      <div className="relative flex justify-between items-center px-5 py-3">
        <Link href="/home" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-[12px] bg-sky-100 flex items-center justify-center">
            <img src="/wag.png" alt="logo" className="w-6 h-6 object-contain" />
          </div>
          <span className={`${jua.className} text-[28px] text-sky-400 drop-tracking-wide`}>
            WAGIE
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/robot" className="relative w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center active:scale-90 transition-transform" title="AI">
            <span className="absolute -top-1 -right-1 bg-red-400 text-white text-[8px] font-bold px-1 py-0.5 rounded-full leading-none">NEW</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="6" stroke="#50caff" strokeWidth="1.5"/>
              <circle cx="12" cy="2" r="1.5" fill="#50caff" stroke="none"/>
              <rect x="3" y="6" width="18" height="15" rx="5" fill="#2d3748" stroke="none"/>
              <circle cx="9" cy="12" r="1.8" fill="#50caff" stroke="none"/>
              <circle cx="15" cy="12" r="1.8" fill="#50caff" stroke="none"/>
              <path d="M9 17 Q12 19.5 15 17" stroke="#50caff" strokeWidth="1.5" fill="none"/>
            </svg>
          </Link>
          <Link href="/tools"
            className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center active:scale-90 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="#50caff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
        </div>
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
