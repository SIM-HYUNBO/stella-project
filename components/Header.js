import Link from "next/link";

const Header = () => {
  return (
    <header className="bg-white dark:bg-slate-700 z-50 sticky top-0 right-0 w-full flex justify-between items-center px-6 py-4">
      {/* 제목 클릭 시 홈으로 이동 */}
      <Link
        href="/"
        className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-pink-500 dark:text-white tracking-wide"
      >
        GENIUS
      </Link>

      {/* 오른쪽 끝 영역 */}
      <div className="flex justify-start">{/* 여기에 버튼들 */}</div>
    </header>
  );
};

export default Header;
