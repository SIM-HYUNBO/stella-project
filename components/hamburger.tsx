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
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
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
      await signOut(auth);
      router.push("/");
    } catch (err: any) {
      if (err.code === "auth/wrong-password") {
        alert("비밀번호가 올바르지 않습니다.");
      } else if (err.code === "auth/requires-recent-login") {
        alert("최근 로그인 후 다시 시도해주세요.");
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
        className="fixed top-4 right-4 w-12 h-12 flex flex-col justify-between p-2 bg-amber-200 dark:bg-slate-600 border rounded-xl shadow-md z-50"
      >
        <span className="h-1 bg-[#4a342a] dark:bg-white rounded" />
        <span className="h-1 bg-[#4a342a] dark:bg-white rounded" />
        <span className="h-1 bg-[#4a342a] dark:bg-white rounded" />
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed top-20 right-4 w-60 bg-amber-50 dark:bg-slate-700 rounded-2xl px-6 py-5 shadow-xl z-40 flex flex-col gap-4"
        >
          {/* 로그인 상태 */}
          {user ? (
            <>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-amber-100 dark:hover:bg-slate-600"
              >
                <TextAvatar
                  nickname={nickname || "유저"}
                  size={48}
                  profileImage={profileImage}
                />
                <span className="font-semibold">
                  {nickname || "유저"}
                </span>
              </button>

              {profileMenuOpen && (
                <div
                  ref={profileRef}
                  className="bg-amber-100 dark:bg-slate-600 rounded-xl px-4 py-3 space-y-2"
                >
                  <button
                    onClick={() => router.push("/profile/edit")}
                    className="w-full text-left"
                  >
                    ✏️ 편집
                  </button>
                    <button
                    onClick={() => router.push("/genius")}
                    className="w-full text-left"
                  >
                    👤 천왁즈
                  </button>
                  <button
                    onClick={() => signOut(auth)}
                    className="w-full text-left text-red-500"
                  >
                    🚪 로그아웃
                  </button>
                  <button
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="w-full text-left text-red-700"
                  >
                    🛑 계정 탈퇴
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-2 rounded-2xl bg-amber-300 font-semibold"
            >
              🔐 로그인
            </button>
          )}

          {/* 공통 메뉴 */}
          {[
            ["/home", "🏠 Home"],
            ["/Clips", "🎬 Clips"],
            ["/Notes", "📝 Notes"],
            ["/study", "📚 Study"]
          ].map(([href, label]) => (
            <Link key={href} href={href} className="p-2 rounded-xl hover:bg-amber-100">
              {label}
            </Link>
          ))}

          <button
            onClick={() =>
              setTheme(currentTheme === "dark" ? "light" : "dark")
            }
            className="py-2 rounded-xl bg-amber-200 dark:bg-slate-500"
          >
            {currentTheme === "dark" ? "☀️ 라이트 모드" : "🌙 다크 모드"}
          </button>

          {/* ⭐ 중등 와기 이동 */}
          <Link
            href="/m-home"
            className="text-center text-orange-400 hover:underline"
          >
            중등 와기로 이동
          </Link>
        </div>
      )}

      {/* 탈퇴 모달 */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-700 p-6 rounded-xl w-80 space-y-4">
            <h2 className="text-red-600 font-bold text-lg">
              정말 탈퇴하시겠습니까?
            </h2>
            <input
              type="password"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                예
              </button>
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                className="bg-gray-300 px-4 py-2 rounded"
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
