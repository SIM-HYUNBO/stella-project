"use client";
import { useState, useEffect } from "react";
import PageContainer from "/components/PageContainer";
import { CenterSpinner } from "/components/CenterSpinner";
import HamburgerMenu from "/components/hamburger";
import { useRouter } from "next/navigation"; // ✅ 추가

export default function Clips() {
  const [loading, setLoading] = useState(true);
  const router = useRouter(); // ✅ 라우터 객체 생성

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {loading && <CenterSpinner />}

      <PageContainer>
        <div className="p-6">
          <h1 className="text-3xl font-bold text-orange-900 dark:text-white mb-4">
            helpful clips.
          </h1>
          <HamburgerMenu />

          <div className="relative w-full h-0 pb-[56.25%]">
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src="https://www.youtube.com/embed/ZvjCiJALNTY"
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* ✅ 맨 아래 업로드 버튼 (router.push 사용) */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => router.push("/video-c")}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              동영상 업로드
            </button>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
