"use client";

import { ReactNode, useState } from "react";
import LeftMenu from "/components/leftMenu";

interface PageLayoutProps {
  children: ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 - 항상 고정 */}
      <header className="sticky top-0 z-50 bg-green-700 text-white flex items-center px-6 py-4 shadow-md">
        <h1 className="text-3xl font-extrabold">DMD Homepage</h1>
      </header>

      {/* 메인 영역: 좌측 메뉴 + 콘텐츠 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 메뉴 */}
        <div className="w-64 bg-gray-200">
          <LeftMenu />
        </div>

        {/* 콘텐츠 영역: 스크롤 가능 */}
        <main className="flex-1 p-6 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
