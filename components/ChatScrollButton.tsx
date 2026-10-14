"use client";

export default function ChatScrollButton({ count, onClick, color }: { count: number; onClick: () => void; color: string }) {
  return (
    <button type="button" onClick={onClick}
      aria-label={count ? `새 메시지 ${count}개, 최신 메시지로 이동` : "최신 메시지로 이동"}
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 whitespace-nowrap rounded-full border border-gray-100 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-lg active:scale-95 transition">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m-6-6 6 6 6-6" /></svg>
      <span aria-live="polite">{count ? `새 메시지 ${count}개` : "최신 메시지"}</span>
    </button>
  );
}
