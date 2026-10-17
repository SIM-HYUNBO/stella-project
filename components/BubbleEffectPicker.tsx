"use client";

import { BUBBLE_EFFECTS, BubbleEffect } from "@/lib/bubble-effects";
import styles from "./BubbleEntrance.module.css";

export default function BubbleEffectPicker({ value, onChange, onClose, color, softColor }: { value: BubbleEffect; onChange: (value: BubbleEffect) => void; onClose: () => void; color: string; softColor: string }) {
  return <section aria-label="말풍선 등장 효과 선택" className="mx-4 mb-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
    <div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">다음 메시지에 등장 효과 넣기</span>
      <button type="button" aria-label="등장 효과 선택 닫기" onClick={onClose} className="px-2 py-1 text-slate-400">✕</button></div>
    <div className="grid grid-cols-4 gap-2">{BUBBLE_EFFECTS.map(effect => <button key={effect.id} type="button" aria-pressed={value === effect.id} onClick={() => onChange(effect.id)}
      className="flex min-w-0 flex-col items-center gap-2 rounded-xl border px-1 py-3 text-xs transition" style={{ borderColor: value === effect.id ? color : "#f1f5f9", color: value === effect.id ? color : "#64748b" }}>
      <span aria-hidden="true" className={`flex h-8 w-10 items-center justify-center rounded-xl rounded-br-sm ${effect.id !== "none" ? `${styles[effect.id]} ${styles.preview}` : ""}`} style={{ background: softColor }}>Aa</span>
      <span>{effect.label}</span>
    </button>)}</div>
  </section>;
}
