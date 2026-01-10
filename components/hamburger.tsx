"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { auth, db } from "@/app/firebase";
import {
  onAuthStateChanged,
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import TextAvatar from "./TextAvatar";
import { useRouter } from "next/navigation";

export default function HamburgerMenuWithDelete() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
        // setConfirmDeleteOpen(false); <- 이제 입력창 클릭에도 모달 안 닫힘
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!password) return alert("비밀번호를 입력해주세요.");

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, password);
      await reauthenticateWithCredential(user, credential);

      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);

      alert("계정이 성공적으로 삭제되었습니다.");

      // 탈퇴 후 로그아웃 상태 홈으로 이동
      signOut(auth);
      router.push("/"); // 홈 화면
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        alert("비밀번호가 올바르지 않습니다.");
      } else if (err.code === "auth/requires-recent-login") {
        alert("보안상 최근 로그인 후에만 탈퇴 가능합니다. 다시 로그인해주세요.");
      } else {
        alert("계정 삭제 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
      setConfirmDeleteOpen(false);
    }
  };

  if (!mounted) return null;
  const currentTheme = theme || "light";

  return (
    <>
      {/* 햄버거 버튼 */}
      <button
        onClick={() => {
          setMenuOpen(!menuOpen);
          setProfileMenuOpen(false);
          setConfirmDeleteOpen(false);
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
              <button
                onClick={() => setConfirmDeleteOpen(true)}
                className="w-full text-left text-red-700 hover:opacity-70 font-medium transition"
              >
                🛑 계정 탈퇴
              </button>
            </div>
          )}

          {/* 메뉴 링크 */}
          {[
            { href: "/home", label: "🏠 Home" },
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

          <button
            onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
            className="mt-2 inline-flex items-center justify-center py-2 px-4 bg-amber-200 dark:bg-slate-500 rounded-xl shadow hover:shadow-lg transition text-[#4a342a] dark:text-white font-semibold"
          >
            {currentTheme === "dark" ? "☀️ 라이트 모드" : "🌙 다크 모드"}
          </button>
                <Link
            href="/m-home"
            className="px-6 py-3 text-orange-400 hover:underline rounded-xl text-center"
          >
            중등 와기로 이동
          </Link>
        </div>
      )}

      {/* 계정 탈퇴 모달 */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-slate-700 rounded-xl p-6 w-80 shadow-lg flex flex-col gap-4">
            <h2 className="text-xl font-bold text-red-600">정말로 탈퇴하시겠습니까?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              탈퇴 시 계정을 복구할 수 없습니다.
            </p>
            {/* 입력창 클릭해도 모달 안닫힘 */}
            <input
              type="password"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border rounded px-3 py-2 mt-2 w-full"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleDeleteAccount}
                className={`px-4 py-2 bg-red-600 text-white rounded ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={loading}
              >
                예
              </button>
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-4 py-2 bg-gray-300 text-black rounded"
              >
                아니오
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
