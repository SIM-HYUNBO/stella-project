"use client";

import { useRouter } from "next/navigation";

export default function FriendSettingsMenu() {
  const router = useRouter();

  const menus = [
    { icon: "🚫", label: "차단 친구",   sub: "차단한 사용자 관리",   path: "/friends/blocked",  color: "from-red-400 to-rose-400" },
    { icon: "🙈", label: "숨긴 친구",   sub: "숨김 처리한 친구 목록", path: "/friends/hidden",   color: "from-slate-400 to-gray-500" },
    { icon: "🔕", label: "알림 끈 친구", sub: "알림을 끈 친구 목록",  path: "/friends/muted",    color: "from-violet-400 to-purple-500" },
    { icon: "🧹", label: "친구 정리",   sub: "비활성 친구 정리하기",  path: "/friends/cleanup",  color: "from-sky-400 to-sky-500" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gray-50" />

      <div className="relative z-10">
        <div className="flex items-center h-14 px-4 bg-white border-b-2 border-gray-700 sticky top-0 z-20">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-50 text-sky-500 font-bold text-lg mr-3">←</button>
          <span className="font-black text-[gray-800] text-base">친구 설정 ⚙️</span>
        </div>

        <div className="px-5 pt-6 pb-16 space-y-3">
          {menus.map(({ icon, label, sub, path, color }) => (
            <button key={path} onClick={() => router.push(path)}
              className="w-full rounded-[22px] overflow-hidden shadow-[0_6px_24px_rgba(14,165,233,0.15)] active:scale-[0.98] transition-transform">
              <div className="bg-white border-2 border-gray-700 px-5 py-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl shadow-md shrink-0`}>{icon}</div>
                <div className="text-left flex-1">
                  <p className="font-black text-[gray-800] text-base">{label}</p>
                  <p className="text-[sky-500] text-xs mt-0.5">{sub}</p>
                </div>
                <span className="text-sky-400 text-2xl">›</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
