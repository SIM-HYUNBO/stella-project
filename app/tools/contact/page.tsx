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

      <div className="flex flex-col items-center justify-center pt-20 gap-3">
        <div className="text-lg font-bold">WAGIE 고객센터</div>
        <a
          href="mailto:hbsim0605@gmail.com"
          className="text-violet-500 text-sm"
        >
          hbsim0605@gmail.com
        </a>
      </div>
    </div>
  );
}
