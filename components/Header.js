

const Header = () => {
  return (
    <header className="bg-white dark:bg-slate-700 z-50 sticky top-0 right-0  w-full flex justify-between items-center px-6 py-4">
      <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-pink-500  dark:text-white-tracking-wide">
        GENIUS
      </h1>

      {/* DarkModeToggleButton을 오른쪽 끝으로 정렬 */}
      <div className="flex justify-start">
       
      </div>
    </header>
  );
};

export default Header;
