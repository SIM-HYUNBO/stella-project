"use client";

import { useRouter } from "next/navigation";

const menus = [
  { icon: "ℹ️", label: "앱 정보", path: "/tools/appinfo" },
  { icon: "🔔", label: "알림",   path: "/no" },
  { icon: "👥", label: "친구",   path: "/fri" },
  { icon: "✍️", label: "글씨체", path: "/font" },
  { icon: "🎨", label: "테마",   path: "/themes" },
];

export default function SettingsPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-[#fff6ee] via-[#fff0e0] to-[#fff8f0]" />
      <div className="relative z-10">
        <div className="flex items-center h-14 px-4 bg-white/60 backdrop-blur-md border-b border-orange-100 sticky top-0 z-20">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-400 font-bold text-lg mr-3">←</button>
          <span className="font-black text-[#3d1f00] text-base">⚙️ 설정</span>
        </div>

        <div className="px-5 pt-6 pb-16 space-y-3">
          {menus.map(({ icon, label, path }) => (
            <button key={path} onClick={() => router.push(path)}
              className="w-full rounded-[20px] bg-white/80 backdrop-blur-sm border border-orange-100 px-5 py-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-xl shrink-0 shadow-sm">{icon}</div>
                <span className="font-black text-[#3d1f00] text-sm">{label}</span>
              </div>
              <span className="text-orange-300 text-lg font-bold">›</span>
            </button>
          ))}

          <div className="rounded-[20px] bg-orange-50 border border-orange-100 px-5 py-4 text-center mt-2">
            <p className="text-[#c07030] text-sm font-semibold">✨ 더 많은 기능을 기대해 주세요</p>
          </div>
        </div>
      </div>
    </main>
  );
}
