"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import TextAvatar from "./TextAvatar";
import { useRouter } from "next/navigation";

export default function HamburgerMenuWithDarkModeInside() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setNickname(userDoc.data().nickname);
          setProfileImage(userDoc.data().profileImage || null);
        }
      } else {
        setUser(null);
        setNickname(null);
        setProfileImage(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) return null;
  const currentTheme = theme || "light";

  return (
    <>
      {/* 햄버거 버튼 */}
      <button
        onClick={() => {
          setMenuOpen(!menuOpen);
          setProfileMenuOpen(false);
        }}
        className="fixed top-4 right-4 w-12 h-12 flex flex-col justify-between p-2 bg-amber-200 dark:bg-slate-600 border rounded-xl shadow-md hover:shadow-xl transition z-50"
      >
        <span className="block h-1 w-full bg-[#4a342a] dark:bg-white rounded"></span>
        <span className="block h-1 w-full bg-[#4a342a] dark:bg-white rounded"></span>
        <span className="block h-1 w-full bg-[#4a342a] dark:bg-white rounded"></span>
      </button>

      {/* 메뉴 */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed top-20 right-4 bg-amber-50 dark:bg-slate-700 shadow-xl rounded-2xl px-6 py-5 z-40 flex flex-col gap-4 w-60 border border-amber-200 dark:border-slate-500"
        >
          {user && (
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-full flex items-center gap-3 hover:bg-amber-100 dark:hover:bg-slate-600 p-2 rounded-xl transition"
            >
              <TextAvatar
                nickname={nickname || "유저"}
                size={48}
                profileImage={profileImage}
              />
              <span className="text-[#4a342a] dark:text-white text-lg font-semibold">
                {nickname || "유저"}
              </span>
            </button>
          )}

          {/* 프로필 미니 메뉴 */}
          {profileMenuOpen && (
            <div
              ref={profileRef}
              className="bg-amber-100 dark:bg-slate-600 w-full rounded-xl px-4 py-3 space-y-3 shadow-inner"
            >
              <button
                onClick={() => {
                  router.push("/profile/edit");
                  setMenuOpen(false);
                }}
                className="w-full text-left text-[#4a342a] dark:text-white font-medium hover:opacity-70 transition"
              >
                ✏️ 편집
              </button>
              <button
                onClick={() => signOut(auth)}
                className="w-full text-left text-red-500 hover:opacity-70 font-medium transition"
              >
                🚪 로그아웃
              </button>
            </div>
          )}

          {/* 메뉴 링크 */}
          {[
            { href: "/", label: "🏠 Home" },
            { href: "/Clips", label: "🎬 Clips" },
            { href: "/Notes", label: "📝 Notes" },
            { href: "/study", label: "📚 Study" },
            { href: "/contact", label: "📩 Contact" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="text-[#4a342a] dark:text-white font-medium hover:bg-amber-100 dark:hover:bg-slate-600 p-2 rounded-xl transition"
            >
              {label}
            </Link>
          ))}

          {/* 다크모드 전환 */}
          <button
            onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
            className="mt-2 inline-flex items-center justify-center py-2 px-4 bg-amber-200 dark:bg-slate-500 rounded-xl shadow hover:shadow-lg transition text-[#4a342a] dark:text-white font-semibold"
          >
            {currentTheme === "dark" ? "☀️ 라이트 모드" : "🌙 다크 모드"}
          </button>
        </div>
      )}
    </>
  );
}
