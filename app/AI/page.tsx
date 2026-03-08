"use client";

import PageContainer from "@/components/PageContainer";
import { useRouter } from "next/navigation";

export default function SamplePage() {
  const router = useRouter();

  return (
    <PageContainer>
      {/* 한 줄 글씨 */}
      <p className="text-lg font-medium mb-4">
       여러 모드의 AI와 대화를 나누세요!
      </p>

      {/* 버튼 */}
      <button
        className="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => router.push("/AItalk")}
      >
        승부욕 모드
      </button>
      <button
        className="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => router.push("/sAI")}
      >
        소심 모드
      </button>
      <button
        className="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => router.push("/jAI")}
      >
        장난 모드
      </button>
    </PageContainer>
  );
}