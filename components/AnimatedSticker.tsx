"use client";

import { useEffect, useId, useRef, useState } from "react";
import { STICKER_MOTIONS, isStickerVoice, isStickerFace, STICKER_VOICE_EVENT, StickerVoice, StickerFace } from "@/lib/custom-stickers";
import StickerFaceImage from "./StickerFaceImage";
import styles from "./AnimatedSticker.module.css";

export default function AnimatedSticker({ src, motion, small = false, name = "직접 만든 이모티콘", voice, face }: { src: string; motion?: string; small?: boolean; name?: string; voice?: StickerVoice; face?: StickerFace }) {
  const selected = STICKER_MOTIONS.find(item => item.id === motion)?.id || "still";
  const audio = useRef<HTMLAudioElement>(null), id = useId();
  const [playing, setPlaying] = useState(false), [error, setError] = useState(false);
  const sound = isStickerVoice(voice) ? voice : null;
  useEffect(() => {
    const stop = (e: Event) => { if ((e as CustomEvent).detail !== id) { audio.current?.pause(); setPlaying(false); } };
    window.addEventListener(STICKER_VOICE_EVENT, stop);
    const player = audio.current;
    return () => { window.removeEventListener(STICKER_VOICE_EVENT, stop); player?.pause(); };
  }, [id, sound?.data]);
  const picture = isStickerFace(face) ? <StickerFaceImage src={src} face={face} small={small} name={name} /> : <img src={src} alt={name} draggable={false} className={`${styles.image} ${small ? styles.small : ""} ${styles[selected] || ""}`} />;
  if (!sound) return <span className={styles.frame}>{picture}</span>;
  return <span className={styles.frame} style={{ flexDirection: "column" }}>
    <button type="button" aria-label={`${name} 목소리 ${playing ? "멈추기" : "듣기"}`} onClick={async e => {
      e.stopPropagation(); const player = audio.current; if (!player) return;
      if (!player.paused) { player.pause(); setPlaying(false); return; }
      window.dispatchEvent(new CustomEvent(STICKER_VOICE_EVENT, { detail: id }));
      setError(false); player.currentTime = 0;
      try { await player.play(); setPlaying(true); } catch { setError(true); setPlaying(false); }
    }} style={{ position: "relative", border: 0, padding: 0, background: "transparent" }}>
      {picture}<span style={{ position: "absolute", bottom: 0, right: 0, background: "#fff", borderRadius: 20, padding: 5, color: "#64748b" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m11 5-6 4H2v6h3l6 4V5Z" /><path d={playing ? "M16 8v8M20 8v8" : "M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"} /></svg>
      </span>
    </button>
    <audio ref={audio} src={sound.data} preload="none" onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} />
    {error && <span role="status" className="text-[10px] text-slate-500">이 브라우저에서 재생할 수 없어.</span>}
  </span>;
}
