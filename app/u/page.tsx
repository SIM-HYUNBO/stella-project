"use client";
import React, { useState } from "react";
import PageContainer from "@/components/PageContainer";
import CommentBox from "@/components/CommentBox";
import BrunnerVideo from "@/components/brunnerVideo";
import { useRouter } from "next/navigation";

// 한국사 시대 데이터
const periods = [
  {
    id: "ancient",
    title: "고대 국가의 형성",
    year: "기원전 ~ 676년",
    desc: "고조선 건국으로 시작해 삼국이 통일 신라로 귀결된 시기입니다. 농경과 철기 문화가 발달하며 중앙집권적 국가가 등장했습니다.",
  },
  {
    id: "goryeo",
    title: "고려 시대",
    year: "918 ~ 1392년",
    desc: "왕건이 고려를 세우고 불교를 국교로 삼았습니다. 활자 인쇄술, 청자 등의 문화가 발전했습니다.",
  },
  {
    id: "joseon",
    title: "조선 시대",
    year: "1392 ~ 1897년",
    desc: "유교 중심의 사회 체계가 정립되었으며, 세종대왕의 훈민정음 창제가 대표적인 업적입니다.",
  },
  {
    id: "modern",
    title: "근현대사",
    year: "1897 ~ 현재",
    desc: "대한제국 수립, 일제강점기, 해방과 분단, 산업화와 민주화, 그리고 현대 대한민국의 발전까지 이어집니다.",
  },
];

export default function KoreaHistoryPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const selectedPeriod = periods.find((p) => p.id === selected);

  return (
    <PageContainer>

      <div className="relative w-full h-screen bg-white overflow-hidden">
        {/* 상단 제목 */}
        <button
          onClick={() => router.push("/study")}
          className="absolute top-6 right-8 text-orange-600 hover:underline text-lg"
        >
          « back
        </button>

        <div className="absolute top-6 left-72 transform -translate-x-1/2 flex flex-col items-left">
          <h1 className="text-5xl text-orange-400">
          History
          </h1>
          <p className="text-orange-900 text-2xl mt-2">
          Clicking on an era brings up a description below.
          </p>
        </div>

        {/* 수직선 타임라인 */}
        <div className="absolute top-40 left-1/2 transform -translate-x-1/2 w-1 bg-orange-300 rounded-full bottom-4"></div>

        {/* 시대별 버튼 */}
        <div className="flex flex-col items-center justify-center mt-40 mb-24 space-y-20">
  {periods.map((period) => (
    <button
      key={period.id}
      onClick={() => setSelected(period.id)}
      className={`relative px-6 py-3 min-w-[180px] whitespace-nowrap rounded-full font-bold shadow-sm border transition-all duration-200
        ${
          selected === period.id
            ? "bg-orange-500 text-white scale-110 border-orange-500"
            : "bg-white text-orange-600 hover:bg-orange-100 border-orange-300"
        }`}
    >
      {period.title}
      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-600">
        {period.year}
      </span>
    </button>
  ))}
</div>
      </div>

      {/* 선택된 시대 설명 */}
      {selectedPeriod && (
        <div className="p-10 mt-10 bg-white rounded-2xl shadow-lg max-w-3xl mx-auto">
          <h2 className="text-3xl text-orange-600 font-bold mb-2">
            {selectedPeriod.title}
          </h2>
          <p className="text-gray-600 text-lg mb-4">{selectedPeriod.year}</p>
          <p className="text-gray-800 text-xl leading-relaxed">
            {selectedPeriod.desc}
          </p>
        </div>
      )}

      {/* 하단 동영상 & 댓글 */}
  
    </PageContainer>
  );
}
