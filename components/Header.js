import Link from "next/link";
import RobotWelcomeArt from "./RobotWelcomeArt";
import localFont from "next/font/local";

const jua = localFont({ src: "../app/fonts/google/Jua-Regular.ttf", weight: "400", display: "swap", preload: false });

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white border-b border-sky-100/80">

      <div className="relative mx-auto flex h-16 max-w-4xl justify-between items-center gap-3 px-4 sm:px-6">
        <Link href="/home" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-[13px] bg-amber-50 border border-amber-100 flex items-center justify-center">
            <img src="/wag.png" alt="logo" className="w-6 h-6 object-contain" />
          </div>
          <span className={`${jua.className} text-[26px] text-sky-500 tracking-wide`}>
            WAGIE
          </span>
          <span className="hidden min-[390px]:inline text-[13px] text-slate-400 font-light ml-2 animate-[fadeInSlow_1.2s_ease_0.8s_both] motion-reduce:animate-none">
            wagging duck
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/robot" className="relative w-10 h-10 rounded-[15px] border border-sky-100 bg-sky-50 flex items-center justify-center active:scale-95 transition-transform" title="AI" aria-label="AI 채팅 열기">
            <RobotWelcomeArt color="#38bdf8" icon />
          </Link>
          <Link href="/tools"
            aria-label="설정 열기" className="w-10 h-10 rounded-[15px] border border-slate-100 bg-white flex items-center justify-center active:scale-95 transition-transform">
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
        @keyframes fadeInSlow {
          0% { opacity: 0; transform: translateY(3px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
};

export default Header;
