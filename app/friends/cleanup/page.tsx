"use client";

import { useRouter } from "next/navigation";

export default function CleanupPage() {
  const router = useRouter();

  const items = [
    { icon: "💬", label: "최근 대화 없는 친구", sub: "30일 이상 대화가 없는 친구" },
    { icon: "😴", label: "활동 없는 친구",       sub: "최근 활동이 없는 친구" },
    { icon: "🖼️", label: "프로필 없는 친구",    sub: "프로필 사진이 없는 친구" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gray-50" />
      <div className="relative z-10">
        <div className="flex items-center h-14 px-4 bg-white sticky top-0 z-20">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-50 text-sky-600 font-bold text-lg mr-3">←</button>
          <span className="font-black text-slate-800 text-base">🧹 친구 정리</span>
        </div>
        <div className="px-5 pt-6 pb-16 space-y-3">
          {items.map(({ icon, label, sub }) => (
            <div key={label} className="rounded-[20px] bg-white px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-200 flex items-center justify-center text-2xl shrink-0 shadow">{icon}</div>
              <div>
                <p className="font-black text-slate-800 text-sm">{label}</p>
                <p className="text-sky-600 text-xs mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
          <div className="rounded-[20px] bg-gray-50 px-5 py-4 mt-2">
            <p className="text-sky-800 text-sm font-semibold">👉 실제 정리 기능은 추후 업데이트 예정이에요.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
