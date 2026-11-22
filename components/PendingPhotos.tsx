"use client";
/* eslint-disable @next/next/no-img-element -- Temporary user-selected photo previews. */
import { Send, X } from "lucide-react";
export type PendingPhoto = { file: File; previewUrl: string };
export default function PendingPhotos({ photos, sending, onRemove, onCancel, onSend }: { photos: PendingPhoto[]; sending: boolean; onRemove: (index: number) => void; onCancel: () => void; onSend: () => void }) {
  return <div className="px-3 py-3 bg-white flex flex-col gap-2 shrink-0 border-t border-slate-100">
    <div className="flex justify-between items-center text-xs text-slate-500"><span>사진 {photos.length}/9 · 여러 장은 한 묶음으로 보내져</span><button type="button" aria-label="사진 선택 취소" disabled={sending} onClick={onCancel}><X size={16} /></button></div>
    <div className="flex items-center gap-3 min-w-0"><div className="flex flex-1 flex-wrap gap-2 min-w-0">{photos.map((p, i) => <div key={p.previewUrl} className="relative"><img src={p.previewUrl} alt={`선택한 사진 ${i + 1}`} className="w-12 h-12 rounded-xl object-cover" /><button type="button" aria-label={`사진 ${i + 1} 빼기`} disabled={sending} onClick={() => onRemove(i)} className="absolute -top-1 -right-1 bg-slate-600 rounded-full text-white p-0.5"><X size={11} /></button></div>)}</div><button type="button" aria-label="사진 보내기" disabled={sending} onClick={onSend} className="w-10 h-10 rounded-full bg-sky-400 text-white flex items-center justify-center shrink-0 disabled:opacity-40">{sending ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={17} />}</button></div>
  </div>;
}
