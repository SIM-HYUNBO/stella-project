// pages/art.tsx
"use client";

import React, { useState, useEffect } from "react";
import PageContainer from "@/components/PageContainer";
import { useRouter } from "next/navigation";
import SketchBook from "../../components/SketchBook";

const ArtPage: React.FC = () => {
  const router = useRouter();

  return (
    <PageContainer>
      <div className="flex w-full h-screen">
        <div className="flex-1 flex flex-col p-8 overflow-y-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-5xl text-orange-400 dark:text-white">Art</h1>
            <button
              onClick={() => router.push("/study")}
              className="text-orange-600 dark:text-white hover:underline text-lg"
            >
              « back
            </button>
          </div>

          <p className="text-2xl text-orange-900 dark:text-white mb-8">
            Explore and create amazing artworks.
          </p>

          {/* 스케치북 */}
          <div className="p-6 bg-white/70 dark:bg-gray-800/70 rounded-2xl shadow-md max-w-4xl mb-6">
            <h3 className="text-xl font-semibold text-orange-400 mb-3">🎨 SketchBook</h3>
            <SketchBook />
          </div>

          {/* 그림 댓글창 */}
          <div className="p-6 bg-white/70 dark:bg-gray-800/70 rounded-2xl shadow-md max-w-4xl mb-6">
            <h3 className="text-xl font-semibold text-orange-400 mb-3">🖼 Art Comments</h3>
            
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default ArtPage;
