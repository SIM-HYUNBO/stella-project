"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white">
      {/* WAGIE */}
   

      <h1 className="text-6xl font-extrabold tracking-widest mb-6">
        WAGIE
      </h1>

      {/* 문구 */}
      <p className="text-lg text-gray-600 mb-12 text-center">
        Become the only genius that stands out.
      </p>

      {/* 버튼 */}
      <div className="flex gap-2">
          <Link
          href="/home"
          className="px-8 py-3 border border-black text-black hover:bg-black hover:text-white transition"
        >
          Try WAGIE
        </Link>
       
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
