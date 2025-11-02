"use client";
import { useState } from "react";

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div className="relative">
      {/* 햄버거 버튼 */}
      <button
        onClick={toggleMenu}
        aria-label="Toggle Menu"
        className="flex flex-col justify-center items-center w-12 h-12 gap-2 p-2 bg-gray-200 rounded-md border shadow-md z-50 relative"
      >
        <span
          className={`block h-1 w-8 bg-black transition-transform duration-300 ${
            isOpen ? "rotate-45 translate-y-3" : ""
          }`}
        />
        <span
          className={`block h-1 w-8 bg-black transition-opacity duration-300 ${
            isOpen ? "opacity-0" : "opacity-100"
          }`}
        />
        <span
          className={`block h-1 w-8 bg-black transition-transform duration-300 ${
            isOpen ? "-rotate-45 -translate-y-3" : ""
          }`}
        />
      </button>

      {/* 메뉴 슬라이드 */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 z-40 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-end p-4">
          <button
            onClick={toggleMenu}
            aria-label="Close Menu"
            className="text-black text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <ul className="flex flex-col p-4 gap-4 text-lg">
          <li className="hover:text-blue-500 cursor-pointer">Home</li>
          <li className="hover:text-blue-500 cursor-pointer">About</li>
          <li className="hover:text-blue-500 cursor-pointer">Services</li>
          <li className="hover:text-blue-500 cursor-pointer">Contact</li>
        </ul>
      </div>

      {/* 클릭 시 메뉴 외부 클릭 닫기 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30"
          onClick={toggleMenu}
        ></div>
      )}
    </div>
  );
}
