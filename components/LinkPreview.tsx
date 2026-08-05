"use client";
import { useEffect, useState } from "react";

type OGData = { title: string; description: string; image: string; siteName: string };

const URL_RE = /(https?:\/\/[^\s]+)/;

export function extractFirstUrl(text: string): string | null {
  const m = text.match(URL_RE);
  return m ? m[1] : null;
}

export default function LinkPreview({ url, isMine }: { url: string; isMine: boolean }) {
  const [og, setOg] = useState<OGData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`/api/og-preview?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error || (!data.title && !data.image)) { setFailed(true); return; }
        setOg(data);
      })
      .catch(() => setFailed(true));
  }, [url]);

  if (failed || !og) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 block rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm text-left no-underline active:opacity-80 transition-opacity"
      onClick={(e) => e.stopPropagation()}
    >
      {og.image && (
        <img src={og.image} alt="" className="w-full h-32 object-cover" />
      )}
      <div className="px-3 py-2">
        {og.siteName && (
          <p className="text-[10px] font-bold mb-0.5 text-sky-500">{og.siteName}</p>
        )}
        {og.title && (
          <p className="text-xs font-bold leading-snug line-clamp-2 text-slate-800">{og.title}</p>
        )}
        {og.description && (
          <p className="text-[10px] mt-0.5 line-clamp-2 text-slate-500">{og.description}</p>
        )}
      </div>
    </a>
  );
}
