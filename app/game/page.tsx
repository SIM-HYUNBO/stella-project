"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center gap-10
      bg-gradient-to-b from-black via-zinc-900 to-black text-white">

      {/* 타이틀 */}
      <div className="text-center space-y-3">
        <h1 className="text-6xl font-bold tracking-tight">
          Game World
        </h1>
        <p className="opacity-60">
          어디로 들어갈까?
        </p>
      </div>

      {/* 버튼 */}
      <div className="flex gap-6">
        <button
          onClick={() => router.push("/RestF")}
          className="px-8 py-5 rounded-2xl bg-green-600 hover:bg-green-700
            text-2xl transition shadow-lg"
        >
          🌲 숲
        </button>

        <button
          onClick={() => router.push("/RunnerQuiz")}
          className="px-8 py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700
            text-2xl transition shadow-lg"
        >
          🧠 시뮬레이션
        </button>
      </div>

      {/* 설명 */}
      <div className="mt-6 opacity-50 text-sm">
        숲은 힐링 · 시뮬레이션은 집중
      </div>
    </div>
  );
}
