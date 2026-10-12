import type { ButtonHTMLAttributes } from "react";

type Action = "accept" | "decline" | "hangup" | "microphone" | "camera" | "back" | "sound" | "invite";
export default function CallActionButton({ action, off = false, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { action: Action; off?: boolean }) {
  const labels: Record<Action, string> = {
    accept: "영상통화 받기", decline: "영상통화 거절", hangup: "통화 끊기",
    microphone: off ? "마이크 켜기" : "음소거", camera: off ? "카메라 켜기" : "카메라 끄기",
    back: "채팅으로 돌아가기", sound: "상대 소리 켜기", invite: "친구 초대",
  };
  const toggle = action === "microphone" || action === "camera";
  const color = action === "accept" ? "bg-green-500 text-white hover:bg-green-600"
    : action === "decline" || action === "hangup" ? "bg-red-500 text-white hover:bg-red-600"
    : off ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-white/10 text-white hover:bg-white/20";
  return <button type="button" aria-label={labels[action]} title={labels[action]} aria-pressed={toggle ? off : undefined} {...props}
    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 ${color} ${className}`}>
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {(action === "accept" || action === "camera") && <><rect x="3" y="6" width="12" height="12" rx="3" /><path d="m15 10 6-4v12l-6-4" /></>}
      {(action === "decline" || action === "hangup") && <path d="M3 16c-1 0-2-1-2-2v-2c0-1 1-2 2-3 5-4 13-4 18 0 1 1 2 2 2 3v2c0 1-1 2-2 2h-3c-1 0-2-1-2-2v-2a15 15 0 0 0-8 0v2c0 1-1 2-2 2H3Z" />}
      {action === "microphone" && <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></>}
      {action === "back" && <path d="m12 5-7 7 7 7M5 12h14" />}
      {action === "invite" && <><circle cx="9" cy="7" r="4" /><path d="M2 21v-2a7 7 0 0 1 14 0v2M20 8v6M17 11h6" /></>}
      {action === "sound" && <><path d="m11 5-6 4H2v6h3l6 4V5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></>}
      {toggle && off && <path d="m3 3 18 18" strokeWidth="2.5" />}
    </svg>
  </button>;
}
