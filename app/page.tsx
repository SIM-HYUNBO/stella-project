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
        setReady(true); // 로그인 안 된 경우에만 랜딩 페이지 표시
      }
    });
    return () => unsub();
  }, []);

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white">
      <h1 className="text-6xl font-extrabold tracking-widest mb-6">
        WAGIE
      </h1>

      <p className="text-lg text-gray-600 mb-12 text-center">
        친구들과 채팅하세요.
      </p>

      <div className="flex gap-2">
        <Link
          href="/login"
          className="px-8 py-3 border border-black text-black hover:bg-black hover:text-white transition"
        >
          Sign in
        </Link>

        <Link
          href="/signup"
          className="px-8 py-3 border border-black text-black hover:bg-black hover:text-white transition"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
