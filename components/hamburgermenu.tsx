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
        setProfileMenuOpen(false);
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
      signOut(auth);
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
        className="fixed top-4 right-4 w-12 h-12 flex flex-col justify-between p-2 bg-amber-200 dark:bg-slate-600 border rounded-xl shadow-md hover:shadow-xl transition z-50"
      >
        <span className="block h-1 w-full bg-[#4a342a] dark:bg-white rounded" />
        <span className="block h-1 w-full bg-[#4a342a] dark:bg-white rounded" />
        <span className="block h-1 w-full bg-[#4a342a] dark:bg-white rounded" />
      </button>

      {/* 메뉴 */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed top-20 right-4 bg-amber-50 dark:bg-slate-700 shadow-xl rounded-2xl px-6 py-5 z-40 flex flex-col gap-4 w-60 border"
        >
          {/* 로그인 상태 */}
          {user ? (
            <>
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
                    className="w-full text-left font-medium"
                  >
                    ✏️ 편집
                  </button>
                      <button
                    onClick={() => router.push("/foot")}
                    className="w-full text-left"
                  >
                    🏠 마이룸
                  </button>
                    <button
                    onClick={() => router.push("/genius")}
                    className="w-full text-left"
                  >
                    💬 와기 Chat
                  </button>
                  <button
                    onClick={() => signOut(auth)}
                    className="w-full text-left text-red-500 font-medium"
                  >
                    🚪 로그아웃
                  </button>
                  <button
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="w-full text-left text-red-700 font-medium"
                  >
                    🛑 계정 탈퇴
                  </button>
                </div>
              )}
            </>
          ) : (
            /* 로그아웃 상태 */
            <button
              onClick={() => {
                router.push("/login");
                setMenuOpen(false);
              }}
              className="w-full py-2 rounded-xl bg-amber-300 text-[#4a342a] font-semibold hover:opacity-80 transition"
            >
              🔐 로그인
            </button>
          )}

            {/* 공통 메뉴 */}
          {[
            ["/m-home", "🏠 Home"],
            ["/Clips", "🎬 Clips"],
            ["/study", "📚 Study"],
             ["/edu", "🎓 Education"],
            ["/game", "🎮 Game"]
          ].map(([href, label]) => (
            <Link key={href} href={href} className="p-2 rounded-xl hover:bg-amber-100">
              {label}
            </Link>
          ))}


       
       
    <Link
            href="/home"
            className="text-center text-orange-400 hover:underline w-40"
          >
            초등 와기로 이동
          </Link>
        </div>
      )}
       
      {/* 계정 탈퇴 모달 */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-700 rounded-xl p-6 w-80 space-y-4">
            <h2 className="text-xl font-bold text-red-600">
              정말로 탈퇴하시겠습니까?
            </h2>
            <input
              type="password"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                예
              </button>
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded"
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
