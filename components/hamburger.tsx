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

  // 로그인 & Firestore 유저 정보 실시간 반영
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

  // 바깥 클릭 → 메뉴 닫기
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
      {/* === 햄버거 버튼 === */}
      <button
        onClick={() => {
          setMenuOpen(!menuOpen);
          setProfileMenuOpen(false);
        }}
        className="fixed top-4 right-4 w-12 h-12 flex flex-col justify-between p-2 bg-white border rounded shadow z-50"
      >
        <span className="block h-1 w-full bg-black"></span>
        <span className="block h-1 w-full bg-black"></span>
        <span className="block h-1 w-full bg-black"></span>
      </button>

      {/* = 메뉴 = */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed top-16 right-4 bg-white shadow-lg rounded p-4 z-40 flex flex-col space-y-3 items-start"
        >
          {user && (
            <button
              ref={profileRef}
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-full flex items-center gap-2 mb-2"
            >
              <TextAvatar nickname={nickname || "유저"} size={40} profileImage={profileImage} />
              <span className="text-black text-lg font-bold">
                {nickname || "유저"}
              </span>
            </button>
          )}

          {/* 프로필 미니 메뉴 */}
          {profileMenuOpen && (
            <div className="bg-gray-100 w-full rounded px-3 py-2 space-y-2">
              <button
                onClick={() => {
                  router.push("/profile/edit");
                  setMenuOpen(false);
                }}
                className="text-black font-medium block"
              >
              편집
              </button>
              <button
                onClick={() => signOut(auth)}
                className="text-red-500 font-medium block"
              >
              로그아웃
              </button>
            </div>
          )}

          <Link href="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link href="/Clips" onClick={() => setMenuOpen(false)}>Clips</Link>
          <Link href="/Notes" onClick={() => setMenuOpen(false)}>Notes</Link>
          <Link href="/study" onClick={() => setMenuOpen(false)}>Study</Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>

          {/* 다크모드 */}
          <button
            onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
            className="mt-2 inline-flex items-center py-2 px-4 bg-orange-200 rounded"
          >
            {currentTheme === "dark" ? "🌙" : "☀️"}
          </button>
        </div>
      )}
    </>
  );
}
