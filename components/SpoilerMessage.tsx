"use client";

import { ReactNode, useEffect, useState } from "react";

export default function SpoilerMessage({ content, children }: { content: string; children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => setRevealed(false), [content]);
  return <button type="button" aria-expanded={revealed} aria-label={revealed ? "스포일러 다시 가리기" : "스포일러 메시지 보기"}
    onClick={event => { event.stopPropagation(); setRevealed(!revealed); }}
    className="block max-w-full text-left text-inherit">
    {revealed ? <span className="break-words whitespace-pre-wrap">{children}</span> :
      <span className="flex min-w-[140px] flex-col gap-2 py-1">
        <span className="flex items-center gap-1.5 text-xs opacity-80"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>눌러서 비밀 보기</span>
        <span aria-hidden="true" className="h-3 w-28 rounded-full bg-current opacity-20" />
        <span aria-hidden="true" className="h-3 w-20 rounded-full bg-current opacity-10" />
      </span>}
  </button>;
}
