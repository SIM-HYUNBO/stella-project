"use client";

export default function ChatScrollButton({ count, onClick, color }: { count: number; onClick: () => void; color: string }) {
  return (
    <button type="button" onClick={onClick}
      aria-label={count ? `새 메시지 ${count}개, 최신 메시지로 이동` : "최신 메시지로 이동"}
      className="absolute bottom-3 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white shadow-md active:scale-95 transition">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m-6-6 6 6 6-6" /></svg>
      <span className="sr-only" aria-live="polite">{count ? `새 메시지 ${count}개` : "최신 메시지"}</span>
    </button>
  );
}
