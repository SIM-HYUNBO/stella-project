"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

export default function RootPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/home");
      } else {
        setReady(true);
      }
    });

    return () => unsub();
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff7ef]">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-[6px] border-orange-200" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border-[6px] border-transparent border-t-orange-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff7ef]">
      {/* BACKGROUND LIGHT */}
      <div className="absolute inset-0">
        <div className="absolute top-[-120px] left-[-100px] w-[340px] h-[340px] rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute bottom-[-160px] right-[-120px] w-[420px] h-[420px] rounded-full bg-yellow-200/50 blur-3xl" />
      </div>

      {/* WINDOW LIGHT */}
      <div className="absolute top-0 right-0 w-[55%] h-full bg-gradient-to-l from-white/50 to-transparent pointer-events-none" />

      {/* CONTENT */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-10">
        <div
          className="
            relative w-full max-w-[390px]
            rounded-[42px]
            bg-[#fff9f2]/90
            border border-white/60
            shadow-[0_20px_80px_rgba(255,180,80,0.25)]
            backdrop-blur-xl
            overflow-hidden
          "
        >
          {/* TOP */}
          <div className="relative px-8 pt-10 text-center">
            {/* FLOAT ICON */}
            <div className="mx-auto mb-5 relative w-fit">
              <div className="absolute inset-0 bg-orange-300/40 blur-2xl rounded-full" />
              <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-orange-100 to-yellow-100 shadow-lg">
                <span className="text-5xl">💬</span>
              </div>
            </div>

            {/* TITLE */}
            <h1 className="text-[56px] leading-none font-black tracking-[0.18em] text-[#6f4221]">
              WAGIE
            </h1>

            <p className="mt-4 text-[17px] text-[#9d7556]">따뜻한 대화가 시작되는 곳</p>
          </div>

          {/* CHAT PREVIEW */}
          <div className="px-7 mt-10 space-y-3">
            <div className="flex">
              <div className="max-w-[75%] rounded-[22px] rounded-bl-md bg-white px-5 py-3.5 text-sm text-zinc-700 shadow-md shadow-orange-100">
                오늘 진짜 힘들었다 😭
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-[22px] rounded-br-md bg-gradient-to-r from-orange-300 to-amber-300 px-5 py-3.5 text-sm text-white shadow-md shadow-orange-200">
                고생했어... 내가 안아줄게 ☁️
              </div>
            </div>
            <div className="flex">
              <div className="max-w-[75%] rounded-[22px] rounded-bl-md bg-white px-5 py-3.5 text-sm text-zinc-700 shadow-md shadow-orange-100">
                여기 오니까 마음 편하다 🧡
              </div>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="px-6 pt-10 pb-8 space-y-4">
            <Link
              href="/login"
              className="
                group relative flex items-center justify-center
                h-16 rounded-full
                bg-gradient-to-r from-orange-400 to-amber-300
                text-white text-xl font-bold
                shadow-[0_10px_30px_rgba(255,170,80,0.35)]
                transition duration-300
                hover:scale-[1.02]
                active:scale-95
                overflow-hidden
              "
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition" />
              <span className="relative">Sign in</span>
              <span className="absolute right-6 text-2xl">💭</span>
            </Link>

            <Link
              href="/signup"
              className="
                flex items-center justify-center
                h-16 rounded-full
                bg-white/90
                border border-orange-100
                text-[#c97a2f]
                text-xl font-bold
                shadow-lg
                transition duration-300
                hover:bg-orange-50
                active:scale-95
                relative
              "
            >
              <span>Sign up</span>
              <span className="absolute right-6 text-xl">✨</span>
            </Link>

            <p className="pt-2 text-center text-sm text-[#b88a65] leading-relaxed">
              친구들과, 마음을 나눠요 🧡
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
