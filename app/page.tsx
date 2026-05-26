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
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffaf4]">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-[6px] border-orange-200" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border-[6px] border-transparent border-t-orange-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffaf4]">
      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-120px] left-[-80px] w-[320px] h-[320px] rounded-full bg-orange-100 blur-3xl opacity-70" />

        <div className="absolute bottom-[-140px] right-[-100px] w-[340px] h-[340px] rounded-full bg-yellow-100 blur-3xl opacity-80" />

        <div className="absolute top-[30%] right-[10%] w-20 h-20 rounded-full bg-amber-100 blur-2xl opacity-60" />
      </div>

      {/* CONTENT */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        {/* FLOAT ICON */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 rounded-full bg-orange-200 blur-xl opacity-50 animate-pulse" />

          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-orange-200 to-yellow-100 shadow-[0_10px_40px_rgba(255,180,80,0.35)]">
            <span className="text-5xl">💬</span>
          </div>
        </div>

        {/* TITLE */}
        <div className="text-center">
          <h1 className="text-6xl font-black tracking-[0.25em] text-zinc-800 drop-shadow-sm">
            WAGIE
          </h1>

          <div className="mt-5 space-y-2">
            <p className="text-lg text-zinc-600">
              오늘 하루 어땠어?
            </p>

            <p className="text-sm text-zinc-400 leading-relaxed">
              편하게, 따뜻하게,
              <br />
              친구들과 이야기해 봐
            </p>
          </div>
        </div>

        {/* CHAT PREVIEW */}
        <div className="mt-14 w-full max-w-sm space-y-4">
          <div className="flex">
            <div className="max-w-[75%] rounded-[26px] rounded-bl-md bg-white px-5 py-4 text-sm text-zinc-700 shadow-md shadow-orange-100">
              오늘 진짜 힘들었다 😭
            </div>
          </div>

          <div className="flex justify-end">
            <div className="max-w-[75%] rounded-[26px] rounded-br-md bg-orange-300 px-5 py-4 text-sm text-white shadow-md shadow-orange-200">
              고생했어... 내가 안아줄게 ☁️
            </div>
          </div>

          <div className="flex">
            <div className="max-w-[75%] rounded-[26px] rounded-bl-md bg-white px-5 py-4 text-sm text-zinc-700 shadow-md shadow-orange-100">
              여기 오니까 마음 편하다
            </div>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="mt-14 flex w-full max-w-sm flex-col gap-4">
          <Link
            href="/login"
            className="
              group relative overflow-hidden rounded-3xl
              bg-gradient-to-r from-orange-400 to-amber-300
              px-8 py-4 text-center text-lg font-bold text-white
              shadow-[0_10px_30px_rgba(255,170,80,0.4)]
              transition duration-300
              hover:scale-[1.02]
              active:scale-95
            "
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 transition group-hover:opacity-100" />
            <span className="relative">Sign in</span>
          </Link>

          <Link
            href="/signup"
            className="
              rounded-3xl border border-orange-200
              bg-white/80 backdrop-blur
              px-8 py-4 text-center text-lg font-semibold text-orange-500
              shadow-md shadow-orange-100
              transition duration-300
              hover:bg-orange-50
              active:scale-95
            "
          >
            Sign up
          </Link>
        </div>

        {/* FOOTER */}
        <div className="mt-14 text-center">
          <p className="text-xs tracking-wide text-zinc-400">
            작은 대화도 오래 기억되는 공간
          </p>
        </div>
      </section>
    </main>
  );
}