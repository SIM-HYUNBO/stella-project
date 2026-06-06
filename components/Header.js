import Link from "next/link";
import { Jua } from 'next/font/google';

const jua = Jua({ weight: "400", subsets: ["latin"] });

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#FFFBF0]/95 backdrop-blur-sm border-b border-amber-100 shadow-sm shadow-amber-50">
      <div className="flex justify-between items-center px-5 py-3">
        <Link href="/home" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-amber-700 to-amber-500 flex items-center justify-center text-xl shadow-sm shadow-amber-200">
            💬
          </div>
          <span className={`${jua.className} text-[26px] text-stone-800 tracking-wide`}>
            WAGIE
          </span>
        </Link>

        <Link href="/tools"
          className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center active:scale-90 transition-transform shadow-sm shadow-amber-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <line x1="4" y1="8" x2="20" y2="8" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="9" cy="8" r="3" fill="#92400e"/>
            <line x1="4" y1="16" x2="20" y2="16" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="16" cy="16" r="3" fill="#92400e"/>
          </svg>
        </Link>
      </div>
    </header>
  );
};

export default Header;
