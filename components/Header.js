import Link from "next/link";
import Image from "next/image";
import { Jua } from 'next/font/google';

const jua = Jua({
  weight: "400",
  subsets: ["latin"],
});

const Header = () => {
  return (
    <header className="bg-white dark:bg-slate-700 z-50 sticky top-0 right-0 w-full flex justify-between items-center px-6 py-4">
      {/* 로고 + 전구 */}
      <Link href="/home" className="flex items-center gap-3">
       
        <span
          className={`${jua.className} text-[2.75rem] bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-pink-500 dark:text-white ml-5 tracking-tight `}
        >
          WAGIE
        </span>
       
       
      </Link>
      
      

      {/* 오른쪽 끝 영역 */}
      <div className="flex justify-start">
        {/* 버튼들 들어갈 자리 */}
      </div>
    </header>
  );
};

export default Header;
