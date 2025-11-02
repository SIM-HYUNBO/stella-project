"use client";
import SimplePostBox from "../components/SimplePostBox";
import { useEffect, useState } from "react";
import PageContainer from "../components/PageContainer";
import Image from "next/image";
import { useTheme } from "next-themes";
import CommentBox from "../components/CommentBox";
import { CenterSpinner } from "../components/CenterSpinner";
import HamburgerMenu from "../components/hamburger";
import Link from "next/link";

export default function Home() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [loading, setLoading] = useState(true);

  // theme 업데이트
  useEffect(() => {
    setMounted(true);
    setCurrentTheme(theme);
  }, [theme]);

  // 페이지 로딩 시 스피너 표시
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500); // 최소 0.5초
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* 로딩 스피너 */}
      {loading && <CenterSpinner />}

      <PageContainer>
        <div className="flex w-full min-h-screen">
          <div className="flex-1">
            <h1 className="text-5xl text-orange-400 dark:text-white ml-11 mt-5 max-w-3xl w-full text-left">
              {`Let's be a genius.`}
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
              <ul>
                <li>
                  <Link
                    className="px-4 py-2 ml-8 mb-10 bg-yellow-300 text-white rounded hover:bg-yellow-400"
                    href="/board"
                  >
                    GENIUS 게시판 가는 길
                  </Link>
                </li>
              </ul>

              <div className="min-h-full p-6">
                <CommentBox />
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
