"use client"; // 클라이언트 전용

import { useEffect, useState } from "react";
import PageContainer from "../components/PageContainer";
import Image from "next/image";
import { useTheme } from "next-themes";
import HamburgerMenu from "../components/hamburger";
import Link from "next/link";
import { watchAuthState } from "./authService"; // 인증 상태 감지 함수
import { User } from "firebase/auth"; // Firebase 인증 타입
import CommentBox from "../components/CommentBox";
export default function Home() {
  const { theme } = useTheme(); // 테마 관련 상태
  const [mounted, setMounted] = useState(false); // 마운트 여부
  const [currentTheme, setCurrentTheme] = useState(theme); // 현재 테마 상태
  const [user, setUser] = useState<User | null>(null); // 사용자 상태
  const [loading, setLoading] = useState(true); // 로딩 상태

  useEffect(() => {
    const unsubscribe = watchAuthState((u) => {
      console.log("Auth state updated: ", u); // 인증 상태 업데이트 확인
      setUser(u); 
    });

    return () => unsubscribe(); // 컴포넌트 언마운트 시 구독 취소
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer); // 로딩 상태 종료
  }, []);

  console.log("user: ", user); // `user` 상태 값 확인

  return (
    <>
      {loading && (
        <div className="fixed inset-0 flex justify-center items-center bg-white dark:bg-gray-900 z-50">
          Loading...
        </div>
      )}

      <PageContainer>
        <div className="flex w-full min-h-screen">
          <div className="flex-1">
            <h1 className="text-5xl text-orange-400 dark:text-white ml-11 mt-5 max-w-3xl w-full text-left">
              Let's be a genius.
            </h1>

            <HamburgerMenu/>

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

              {/* 로그인 안 된 상태: 로그인 / 회원가입 버튼 */}
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
                  GENIUS 게시판 가는 길
                </Link>
              )}
            </div>
            <CommentBox/>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
