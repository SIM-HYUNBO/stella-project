import Link from "next/link";
import Image from "next/image";

const Header = () => {
  return (
    <header className="bg-white dark:bg-slate-700 z-50 sticky top-0 right-0 w-full flex justify-between items-center px-6 py-4">
      {/* 로고 + 전구 */}
      <Link href="/" className="flex items-center gap-3">
        <Image
          src="/images/LightBulb.png"
          alt="Genius Light Bulb"
          width={48}
          height={48}
    
        />
        <span className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-pink-500 dark:text-white tracking-wide">
          GENIUS
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
