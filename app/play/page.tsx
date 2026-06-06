"use client";

import { useRouter } from "next/navigation";

export default function PlaymobilPage() {
  const router = useRouter();

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <button
        onClick={() => router.back()}
        className="fixed top-4 right-4 z-[100] w-11 h-11 rounded-[14px] bg-sky-500 shadow-[0_4px_14px_rgba(14,165,233,0.4)] flex items-center justify-center text-white font-bold text-lg active:scale-95 transition-transform"
      >
        ←
      </button>
      <iframe
        src="/playmobil_v5.html"
        title="Playmobil Character"
        style={{ width: "100%", height: "100%", border: "none" }}
      />
    </div>
  );
}
