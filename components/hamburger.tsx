"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { auth, db } from "../app/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function HamburgerMenuWithDarkModeInside() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // ✅ 로그인 감지 + Firestore에서 닉네임 불러오기
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setNickname(userDoc.data().nickname);
          } else {
            setNickname(null);
          }
        } catch (err) {
          console.error("닉네임 불러오기 실패:", err);
        }
      } else {
        setUser(null);
        setNickname(null);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!mounted) return null;

  const currentTheme = theme || "light";
  const toggleTheme = () =>
    setTheme(currentTheme === "dark" ? "light" : "dark");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("로그아웃되었습니다!");
      setMenuOpen(false);
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };

  return (
    <>
      {/* 🔹 햄버거 버튼 */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="fixed top-4 right-4 w-12 h-12 flex flex-col justify-between p-2 bg-white border rounded shadow z-50"
      >
        <span className="block h-1 w-full bg-black"></span>
        <span className="block h-1 w-full bg-black"></span>
        <span className="block h-1 w-full bg-black"></span>
      </button>

      {/* 🔹 메뉴 내용 */}
      {menuOpen && (
        <div className="fixed top-16 right-4 bg-white shadow-lg rounded p-4 z-40 flex flex-col space-y-3 items-start">
        <p className="text-black font-medium">
  {user ? `안녕하세요, ${user.displayName || "익명"}님!` : "로그인 해주세요."}
</p>


          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="text-black font-medium"
          >
            Home
          </Link>
          <Link
            href="/Clips"
            onClick={() => setMenuOpen(false)}
            className="text-black font-medium"
          >
            Clips
          </Link>
          <Link
            href="/Notes"
            onClick={() => setMenuOpen(false)}
            className="text-black font-medium"
          >
            Notes
          </Link>
          <Link
            href="/study"
            onClick={() => setMenuOpen(false)}
            className="text-black font-medium"
          >
            Study
          </Link>
          <Link
            href="/contact"
            onClick={() => setMenuOpen(false)}
            className="text-black font-medium"
          >
            Contact
          </Link>

          {/* ✅ 로그아웃 버튼 */}
          {user && (
            <button
              onClick={handleLogout}
              className="mt-2 w-full text-center py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              로그아웃
            </button>
          )}

          {/* ✅ 다크모드 토글 */}
          <button
            onClick={toggleTheme}
            className="mt-3 inline-flex items-center py-2 px-4 bg-orange-100 rounded"
          >
            {currentTheme === "dark" ? "🌙" : "☀️"}
          </button>
        </div>
      )}
    </>
  );
}
