"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function VipPage() {
  const router = useRouter();
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("vip");
    if (saved === "true") setIsVip(true);
  }, []);

  /* 💎 VIP 구매 */
  const handleBuy = async () => {
    setLoading(true);
    await new Promise((res) => setTimeout(res, 1000));

    localStorage.setItem("vip", "true");
    setIsVip(true);

    setLoading(false);
  };

  /* ❌ VIP 취소 */
  const handleCancel = () => {
    localStorage.removeItem("vip");
    setIsVip(false);
    alert("VIP가 해제되었습니다");
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">

      {/* glow background */}
      <div className="absolute w-[500px] h-[500px] bg-purple-500 blur-[140px] opacity-30 rounded-full animate-pulse" />
      <div className="absolute w-[400px] h-[400px] bg-pink-500 blur-[120px] opacity-20 rounded-full top-40 right-20 animate-pulse" />

      <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">

        {/* 타이틀 */}
        <div className="text-center">
          <div className="text-4xl font-bold">💎 VIP ACCESS</div>
          <div className="text-gray-400 text-sm mt-2">
            premium membership control panel
          </div>
        </div>

        {/* 상태 */}
        <div className="mt-6">
          {isVip ? (
            <div className="py-3 rounded-xl bg-green-500/20 text-green-300 text-center border border-green-400/30">
              ✔ VIP ACTIVE
            </div>
          ) : (
            <div className="py-3 rounded-xl bg-white/10 text-gray-300 text-center">
              VIP NOT ACTIVE
            </div>
          )}
        </div>

        {/* 설명 */}
        <div className="mt-6 text-sm text-gray-300 space-y-2">
          <p>✨ 채팅 닉네임 강조 효과</p>
          <p>🔥 메시지 프리미엄 스타일</p>
          <p>🔔 VIP 전용 알림음</p>
          <p>👍 더욱 활성화되는 기능</p>
          <p>🤖 신규 : AI를 이용한 기능 추가</p>
        </div>

        {/* 가격 */}
        {!isVip && (
          <div className="mt-6 text-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
               월 ₩5,000
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="mt-8 flex flex-col gap-3">

          {!isVip && (
            <button
              onClick={handleBuy}
              disabled={loading}
              className="py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold"
            >
              {loading ? "Processing..." : "VIP 구매"}
            </button>
          )}

          {isVip && (
            <button
              onClick={handleCancel}
              className="py-3 rounded-xl bg-red-500/20 text-red-300 border border-red-400/30"
            >
              VIP 해제
            </button>
          )}

          <button
            onClick={() => router.push("/")}
            className="py-3 rounded-xl bg-white/10 hover:bg-white/20"
          >
            돌아가기
          </button>
        </div>
        <div className="text-center text-gray-400 text-sm mt-3">
          언제든 헤제 가능합니다.
        </div>

      </div>
    </div>
  );
}