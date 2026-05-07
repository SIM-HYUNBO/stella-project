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
import { doc, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
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
  const [isVip, setIsVip] = useState(false);

  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  // ✅ 하드코딩 유지
  const SPECIAL_USERS = ["관리자", "나율", "Fred"];

  useEffect(() => setMounted(true), []);

  /* 🔥 사용자 + VIP 로드 */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();

          setNickname(data.nickname);
          setProfileImage(data.profileImage || null);

          // 🔥 VIP Firestore 기준
          setIsVip(data.vip === true);
        }
      } else {
        setUser(null);
        setNickname(null);
        setProfileImage(null);
        setIsVip(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /* 외부 클릭 */
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

  /* 계정 삭제 */
  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!password) return alert("비밀번호를 입력해주세요.");

    setLoading(true);

    try {
      const credential = EmailAuthProvider.credential(
        user.email!,
        password
      );

      await reauthenticateWithCredential(user, credential);

      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);

      alert("계정이 삭제되었습니다.");
      await signOut(auth);
      router.push("/");
    } catch (err: any) {
      alert("계정 삭제 실패");
    } finally {
      setLoading(false);
      setConfirmDeleteOpen(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      {/* 햄버거 버튼 */}
      <button
        onClick={() => {
          setMenuOpen(!menuOpen);
          setProfileMenuOpen(false);
          setConfirmDeleteOpen(false);
        }}
        className="fixed top-4 right-4 w-8 h-9 flex flex-col justify-between p-2 border rounded-xl shadow-md z-50 bg-white"
      >
        <div className="flex flex-col justify-center items-center gap-1 ">
          <span className="w-1 h-1 bg-gray-800 rounded-full"></span>
          <span className="w-1 h-1 bg-gray-800 rounded-full"></span>
          <span className="w-1 h-1 bg-gray-800 rounded-full"></span>
        </div>
      </button>

      {/* 메뉴 */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed top-20 right-4 w-60 bg-white rounded-2xl px-6 py-5 shadow-xl z-40 flex flex-col gap-4"
        >
          {/* 로그인 */}
          {user ? (
            <>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100"
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
                  className="flex flex-col bg-gray-100 rounded-xl px-4 py-3 space-y-2 items-start"
                >
                  <button onClick={() => router.push("/profile/edit")}>
                    ✏️ 편집
                  </button>

                   <button onClick={() => router.push("/play")}>
                    👤 내 아바타
                  </button>
                  <button
                    onClick={() => signOut(auth)}
                    className="text-red-500"
                  >
                    🚪 로그아웃
                  </button>

                  <button
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="text-red-700"
                  >
                    🛑 계정 탈퇴
                  </button>

                 
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-2 rounded-2xl font-semibold"
            >
              🔐 로그인
            </button>
          )}

          {/* 공통 메뉴 */}
          {[
            ["/home", "1:1 채팅"],
            ["/groupchat", "단체 채팅"],
            ["/admintalk", "관리자 톡"],
            ["/AItalk", "이효린 챗"],
            ["/tools", "설정"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="p-2 rounded-xl hover:bg-gray-100"
            >
              {label}
            </Link>
          ))}

         
              <div className="border-t my-2"></div>

              <div className="text-xs text-gray-400 px-2">
                🤖 AI 기능
              </div>

              <Link
                href="/as"
                className="p-2 rounded-xl hover:bg-gray-100"
              >
                AI 채팅 요약
              </Link>

              <Link
                href="/ai-chat"
                className="p-2 rounded-xl hover:bg-gray-100"
              >
                AI 도우미 채팅
              </Link>
          
        

          {/* 🔒 특별 메뉴 (하드코딩 유지) */}
          {SPECIAL_USERS.includes(nickname || "") && (
            <>
              <div className="border-t my-2"></div>

              <div className="text-xs text-gray-400 px-2">
                🔒 특별 메뉴
              </div>

              <Link
                href="/secret"
                className="p-2 rounded-xl hover:bg-gray-100"
              >
                🧠 비밀 메뉴
              </Link>
            </>
          )}
        </div>
      )}

      {/* 탈퇴 모달 */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-80 space-y-4">
            <h2 className="text-red-600 font-bold">
              계정 탈퇴
            </h2>

            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={handleDeleteAccount}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                삭제
              </button>
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}