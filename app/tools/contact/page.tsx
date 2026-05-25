"use client";

import { useRouter } from "next/navigation";

export default function ContactPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <div className="flex items-center h-12 px-3 border-b">
        <button onClick={() => router.back()} className="text-xl mr-2">←</button>
        <div className="text-base font-semibold">고객센터</div>
      </div>

      <div className="flex flex-col items-center justify-center mt-28 gap-5">
        <div className="text-8xl">💌</div>
        <div className="text-2xl font-bold mt-4">WAGIE 고객센터</div>
        <div className="text-lg text-gray-500">skwst0730@gmail.com</div>
        <div className="text-lg text-gray-400">010-0000-0000</div>
      </div>
    </div>
  );
}
