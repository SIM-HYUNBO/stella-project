"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";

export default function HamburgerMenuWithDarkModeInside() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const currentTheme = theme || "light";
  const toggleTheme = () => setTheme(currentTheme === "dark" ? "light" : "dark");

  return (
    <>
      {/* 햄버거 버튼 (우상단) */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="fixed top-4 right-4 w-12 h-12 flex flex-col justify-between p-2 bg-white border rounded shadow z-50"
      >
        <span className="block h-1 w-full bg-black"></span>
        <span className="block h-1 w-full bg-black"></span>
        <span className="block h-1 w-full bg-black"></span>
      </button>

      {/* 햄버거 메뉴 안에 글씨 + 다크모드 버튼 */}
      {menuOpen && (
        <div className="fixed top-16 right-4 bg-white shadow-lg rounded p-4 z-40 flex flex-col space-y-3 items-start">
          {/* 메뉴 링크 */}
          <Link href="/" className="text-black font-medium cursor-pointer">Home</Link>
          <Link href="/Clips" className="text-black font-medium cursor-pointer">Clips</Link>
          <Link href="/Notes" className="text-black font-medium cursor-pointer">Notes</Link>
          <Link href="/study" className="text-black font-medium cursor-pointer">Study</Link>
          <Link href="/contact" className="text-black font-medium cursor-pointer">Contact</Link>

          {/* 메뉴 안 다크모드 버튼 */}
          <button
            onClick={toggleTheme}
            className="mt-2 inline-flex items-center py-2 px-4 bg-orange-100 rounded"
          >
            {/* 햇빛 아이콘 */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className={`h-5 w-5 ${currentTheme === "dark" ? "invisible" : "visible"}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
              />
            </svg>

            {/* 달 아이콘 */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className={`h-5 w-5 ${currentTheme === "light" ? "invisible" : "visible"}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
              />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
