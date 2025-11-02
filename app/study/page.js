"use client";
import { useEffect, useState } from "react";
import PageContainer from "/components/PageContainer";
import Image from "next/image";
import { useTheme } from "next-themes";
import CommentBox from "/components/CommentBox";
import { CenterSpinner } from "/components/CenterSpinner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HamburgerMenu from "/components/hamburger";

export default function Study() {
  const router = useRouter();
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
              Check the tips.
            </h1>
            <HamburgerMenu />

            <h1 className="text-2xl text-orange-900 dark:text-white ml-11 mt-5 w-full text-left">
              CLick the buttons and check each subjects.
            </h1>
            <button
              onClick={() => router.push("/m")}
              className="px-5 py-2.5 bg-orange-300 text-white ml-12 mt-5 rounded-lg transition-all hover:bg-orange-400"
            >
              수학
            </button>
            <button
              onClick={() => router.push("/k")}
              className="px-5 py-2.5 bg-orange-300 text-white ml-12 mt-5 rounded-lg transition-all hover:bg-orange-400"
            >
              국어
            </button>
            <button
              onClick={() => router.push("/e")}
              className="px-5 py-2.5 bg-orange-300 text-white ml-12 mt-5 rounded-lg transition-all hover:bg-orange-400"
            >
              영어
            </button>
            <button
              onClick={() => router.push("/s")}
              className="px-5 py-2.5 bg-orange-300 text-white ml-12 mt-5 rounded-lg transition-all hover:bg-orange-400"
            >
              과학
            </button>
            <button
              onClick={() => router.push("/h")}
              className="px-5 py-2.5 bg-orange-300 text-white ml-12 mt-5 rounded-lg transition-all hover:bg-orange-400"
            >
              사회
            </button>
            <div className="w-full">
              <div className="min-h-full p-6"></div>
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
