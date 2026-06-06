"use client";

import { useRouter } from "next/navigation";

export default function FriendSettingsMenu() {
  const router = useRouter();

  const menus = [
    { icon: "🚫", label: "차단 친구",   sub: "차단한 사용자 관리",   path: "/friends/blocked",  color: "bg-red-100" },
    { icon: "🙈", label: "숨긴 친구",   sub: "숨김 처리한 친구 목록", path: "/friends/hidden",   color: "bg-gray-100" },
    { icon: "🔕", label: "알림 끈 친구", sub: "알림을 끈 친구 목록",  path: "/friends/muted",    color: "bg-violet-100" },
    { icon: "🧹", label: "친구 정리",   sub: "비활성 친구 정리하기",  path: "/friends/cleanup",  color: "bg-sky-100" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gray-50" />

      <div className="relative z-10">
        <div className="flex items-center h-14 px-4 bg-white border-b border-gray-300 sticky top-0 z-20">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-50 text-sky-400 font-bold text-lg mr-3">←</button>
          <span className="font-black text-gray-800 text-base flex items-center gap-2">
            친구 설정
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.82 5.76L8.58 2.6L15.42 2.6L15.18 5.76L15.82 6.13L18.43 4.34L21.85 10.26L18.99 11.64V12.36L21.85 13.74L18.43 19.66L15.82 17.87L15.18 18.24L15.42 21.4L8.58 21.4L8.82 18.24L8.18 17.87L5.57 19.66L2.15 13.74L5.01 12.36V11.64L2.15 10.26L5.57 4.34L8.18 6.13Z"/>
              <circle cx="12" cy="12" r="3.5"/>
            </svg>
          </span>
        </div>

        <div className="px-5 pt-6 pb-16 space-y-3">
          {menus.map(({ icon, label, sub, path, color }) => (
            <button key={path} onClick={() => router.push(path)}
              className="w-full rounded-[22px] overflow-hidden shadow-sm active:scale-[0.98] transition-transform">
              <div className="bg-white border border-gray-300 px-5 py-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-2xl shadow-md shrink-0`}>{icon}</div>
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
