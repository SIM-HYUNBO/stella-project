import type { ButtonHTMLAttributes } from "react";

export default function CallActionButton({ action, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { action: "accept" | "decline" }) {
  const accept = action === "accept";
  const label = accept ? "영상통화 받기" : "영상통화 거절";
  return <button type="button" aria-label={label} title={label} {...props}
    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white transition active:scale-95 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${accept ? "bg-green-500 hover:bg-green-600 focus-visible:outline-green-500" : "bg-red-500 hover:bg-red-600 focus-visible:outline-red-500"}`}>
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {accept ? <><rect x="3" y="6" width="12" height="12" rx="3" /><path d="m15 10 6-4v12l-6-4" /></>
        : <path d="M3 16c-1 0-2-1-2-2v-2c0-1 1-2 2-3 5-4 13-4 18 0 1 1 2 2 2 3v2c0 1-1 2-2 2h-3c-1 0-2-1-2-2v-2a15 15 0 0 0-8 0v2c0 1-1 2-2 2H3Z" />}
    </svg>
  </button>;
}
