"use client";

import { useEffect, useState } from "react";
import PageContainer from "../../components/PageContainer";
import Image from "next/image";
import { useTheme } from "next-themes";
import HamburgerMenu from "../../components/hamburger";
import Link from "next/link";
import { watchAuthState } from "../authService";
import { User } from "firebase/auth";
import CommentBox from "../../components/CommentBox";

export default function Home() {
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthCard, setShowAuthCard] = useState(false);

  // ✅ 로그인 상태 추적
  useEffect(() => {
    const unsubscribe = watchAuthState((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // ✅ 로딩 처리
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  // ✅ 홈 진입 시 자동 카드 표시
  useEffect(() => {
    if (!loading && !user) {
      setShowAuthCard(true);
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        Loading...
      </div>
    );
  }

  return (
    <PageContainer>
      {/* ✅ 헤더: 로그인 상태에 따라 로그인 버튼만 숨김, 프로는 항상 표시 */}
      <div className="absolute top-5 right-20 flex items-center gap-4 z-50">
        {/* 프로 버튼 항상 */}
        <Link href="/pro">
          <span className="px-6 py-3 bg-red-50 text-red-900 hover:bg-red-100 rounded-3xl border border-red-400 block text-center">
            Pro 구입
          </span>
        </Link>

        {/* 로그인 버튼은 로그인 안했을 때만 */}
        {!user && (
          <Link href="/login">
            <span className="px-6 py-3 bg-yellow-50 text-orange-900 hover:bg-yellow-100 rounded-3xl border border-yellow-400 block text-center">
              로그인
            </span>
          </Link>
        )}
      </div>

      <div className="flex w-full min-h-screen">
        <div className="flex-1">
          <h1 className="text-5xl text-orange-400 ml-11 mt-5 max-w-3xl">
            We are Genius in Everything.
          </h1>

          <HamburgerMenu />

          <h2 className="text-2xl text-orange-900 ml-11 mt-5">
            Good Luck! You found our page.
            <br />
            You can check the tips about studying here. Be a genius!
          </h2>

          <div className="w-full">
            <Image
              src="/images/sim.gif"
              alt="설명 텍스트"
              width={300}
              height={300}
              className="ml-10 mt-3 mb-3 rounded-xl"
            />

            {/* ✅ 게시판 버튼 그대로 */}
            <Link
              href="/board"
              className="ml-10 inline-block px-4 py-2 bg-yellow-300 text-white rounded hover:bg-yellow-400"
            >
              WAGIE 게시판 가는 길
            </Link>
          </div>

          <div className="flex justify-start ml-4 mt-5">
            <CommentBox
              postId="home"
              userProfile={
                user
                  ? {
                      uid: user.uid,
                      nickname: user.displayName || "익명",
                    }
                  : null
              }
            />
          </div>
        </div>
      </div>

      {/* ✅ 홈 진입 시 자동 표시 카드 */}
      {!user && showAuthCard && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-[360px] text-center">
            <h2 className="text-lg font-bold mb-4">
              WAGIE를 무제한으로 이용하고 싶다고요?
            </h2>
            <h2 className="text-sm mb-4">
              로그인하여 더 많은 것을 누려보세요!
            </h2>

            <div className="flex flex-col gap-3">
              <Link href="/login">
                <span className="py-3 rounded-xl bg-black text-white hover:bg-gray-800 block">
                  로그인
                </span>
              </Link>

              <Link href="/signup">
                <span className="py-3 rounded-xl border border-black hover:bg-gray-100 hover:text-black block">
                  회원가입
                </span>
              </Link>

              <button
                onClick={() => setShowAuthCard(false)}
                className="py-3 text-gray-500 hover:underline"
              >
                로그아웃 상태 유지
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
