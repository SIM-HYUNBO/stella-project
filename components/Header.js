import Link from "next/link";
import { Jua } from 'next/font/google';
import HamburgerMenu from "/components/hamburger";

const jua = Jua({ weight: "400", subsets: ["latin"] });

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full">
      {/* 배경 그라디언트 */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-300 via-amber-200 to-yellow-200" />
      {/* shimmer */}
      <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.18)_50%,transparent_60%)] animate-[shimmer_4s_infinite]" />
      {/* 하단 그림자 */}
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

        <HamburgerMenu />
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
