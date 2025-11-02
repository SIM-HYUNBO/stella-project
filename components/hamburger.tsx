"use client";

import { useState } from "react";
import Link from "next/link";

export default function HamburgerMenuWithLinks() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      {/* 햄버거 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 w-12 h-12 flex flex-col justify-between p-2 bg-white border rounded shadow z-50"
      >
        <span className="block h-1 w-full bg-black"></span>
        <span className="block h-1 w-full bg-black"></span>
        <span className="block h-1 w-full bg-black"></span>
      </button>

      {/* 메뉴 글씨: 버튼 아래로 나타남 */}
      {isOpen && (
        <div className="fixed top-20 left-4 bg-white shadow-lg rounded p-4 z-40 flex flex-col space-y-2">
          <Link href="/" className="text-black font-medium cursor-pointer">Home</Link>
          <Link href="/Clips" className="text-black font-medium cursor-pointer">Clips</Link>
          <Link href="/Notes" className="text-black font-medium cursor-pointer">Notes</Link>
          <Link href="/study" className="text-black font-medium cursor-pointer">Study</Link>
          <Link href="/contact" className="text-black font-medium cursor-pointer">Contact</Link>
        </div>
      )}
    </div>
  );
}
