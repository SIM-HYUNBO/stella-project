"use client";

import { useEffect, useState } from "react";
import PageContainer from "../components/PageContainer";
import Image from "next/image";
import { useTheme } from "next-themes";
import HamburgerMenu from "../components/hamburger";
import Link from "next/link";
import { watchAuthState } from "./authService"; // 로그인 상태 감지
import { User } from "firebase/auth";
import CommentBox from "../components/CommentBox";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ 로그인 상태 추적
  useEffect(() => {
    const unsubscribe = watchAuthState((u) => {
      console.log("Auth state updated: ", u);
      setUser(u);
    });

    return () => unsubscribe();
  }, []);

  // ✅ 페이지 초기 로딩 상태 해제
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      console.log("✅ 로딩 끝");
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    // ✅ 로딩 오버레이 (화면 덮지 않게 position 변경)
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-gray-900">
        Loading...
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="flex w-full min-h-screen">
        <div className="flex-1">
       
          <h1 className="text-5xl text-orange-400 dark:text-white ml-11 mt-5 max-w-3xl w-full text-left">
            We are Genius in Everything.
          </h1>
    
          <HamburgerMenu />

          <h1 className="text-2xl text-orange-900 dark:text-white ml-11 mt-5 w-full text-left">
            Good Luck! You found our page.
            <br />
            You can check the tips about studying here. Be a genius!
          </h1>

          <div className="w-full">
            <div>
              <Image
                src="/images/sim.gif"
                alt="설명 텍스트"
                width={300}
                height={300}
                className="ml-10 mt-3 mb-5 rounded-xl"
              />
            </div>

            {/* ✅ 로그인 안 된 상태 */}
            {!user ? (
              <div className="flex flex-row ml-10 gap-4">
                <Link
                  href="/login"
                  className="px-6 py-3 bg-blue-400 text-white rounded-xl text-center hover:bg-blue-500"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="px-6 py-3 bg-green-400 text-white rounded-xl text-center hover:bg-green-500"
                >
                  회원가입
                </Link>
              </div>
            ) : (
              <Link
                href="/board"
                className="px-4 py-2 ml-10 mt-5 bg-yellow-300 text-white rounded hover:bg-yellow-400"
              >
                WAGIE 게시판 가는 길
              </Link>
            )}
          </div>

          {/* ✅ 댓글 박스 (이제 버튼 클릭 잘 됨) */}
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
    </PageContainer>
  );
}
