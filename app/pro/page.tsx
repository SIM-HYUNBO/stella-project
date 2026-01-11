"use client";

import Link from "next/link";

export default function PricingCard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">

        {/* Premium - 인기 */}
        <div className="relative bg-white rounded-2xl shadow-lg p-6 w-72 text-center hover:scale-105 transform transition">
          {/* 인기 뱃지 */}
          
          <h2 className="text-2xl font-bold mb-2">Premium</h2>
          <p className="text-gray-500 mb-4">월간 구독</p>
          <p className="text-4xl font-extrabold mb-4">3,000원</p>
          <ul className="text-gray-600 mb-6 text-left">
            <li>✔ 무제한 사용</li>
            <li>✔ 특별 WAGIE 초대</li>
            <li>✔ 프리미엄 기능 제공</li>
            <li>✔ 지금 가입 시 첫 달 50% 할인</li>
          </ul>
          <Link
            href="/signup"
            className="inline-block w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
          >
            구독하기
          </Link>
        </div>

        {/* Pro */}
        <div className="bg-white rounded-2xl shadow-lg p-6 w-72 text-center hover:scale-105 transform transition">
          <h2 className="text-2xl font-bold mb-2">Pro</h2>
          <p className="text-gray-500 mb-4">월간 구독</p>
          <p className="text-4xl font-extrabold mb-4">990원</p>
          <ul className="text-gray-600 mb-6 text-left">
            <li>✔ 무제한 사용</li>
            <li>✔ 특별 기능 제공</li>
            <li>✔ 우선 지원</li>
          </ul>
          <Link
            href="/signup"
            className="inline-block w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
          >
            구독하기
          </Link>
        </div>

      

        {/* Lite */}
        <div className="bg-white rounded-2xl shadow-lg p-6 w-72 text-center hover:scale-105 transform transition">
          <h2 className="text-2xl font-bold mb-2">Basic</h2>
          <p className="text-gray-500 mb-4">월간 구독</p>
          <p className="text-4xl font-extrabold mb-4">0원</p>
          <ul className="text-gray-600 mb-6 text-left">
            <li>✔ 제한적 사용</li>
            <li>✔ 일반적인 기능 제공</li>
            <li>✔ 일반 학습용</li>
          </ul>
          <Link
            href="/home"
            className="inline-block w-full py-3 bg-gray-400 text-white rounded-xl hover:bg-gray-500 transition"
          >
            시작하기
          </Link>
        </div>
      </div>
    </div>
  );
}
