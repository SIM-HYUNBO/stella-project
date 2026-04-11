"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/home"); // 로그인됨
      } else {
        router.replace("/login"); // 로그인 안됨
      }
    });

    return () => unsub();
  }, []);
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white">
      {/* WAGIE */}
   

      <h1 className="text-6xl font-extrabold tracking-widest mb-6">
        WAGIE
      </h1>

      {/* 문구 */}
      <p className="text-lg text-gray-600 mb-12 text-center">
        친구들과 채팅하세요.
      </p>

      {/* 버튼 */}
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
