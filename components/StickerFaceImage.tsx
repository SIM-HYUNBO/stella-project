"use client";

import { useEffect, useRef } from "react";
import { isStickerFace, StickerFace, FacePose, EyePoint } from "@/lib/custom-stickers";
import { paintStickerFace } from "@/lib/sticker-face";

export default function StickerFaceImage({ src, face, pose, eyes, small, name }: { src: string; face?: StickerFace; pose?: FacePose; eyes?: [EyePoint, EyePoint]; small?: boolean; name: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef(pose); live.current = pose;
  useEffect(() => {
    const image = new Image(); let cancelled = false, raf = 0;
    const recorded = isStickerFace(face) ? face : null;
    const points = eyes || recorded?.eyes; if (!points) return;
    image.onload = () => {
      const started = performance.now(), reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const draw = () => {
        if (cancelled || !canvas.current) return;
        let current = live.current;
        if (!current && recorded) {
          const t = ((performance.now() - started) / 1000) % (recorded.duration + 0.5);
          current = recorded.frames[0];
          for (const f of recorded.frames) { if (f.t > t) break; current = f; }
        }
        paintStickerFace(canvas.current, image, current || { t: 0, x: 0, y: 0, roll: 0, left: 1, right: 1 }, points);
        if (!reduced || live.current) raf = requestAnimationFrame(draw);
      };
      draw();
    };
    image.src = src;
    return () => { cancelled = true; cancelAnimationFrame(raf); image.onload = null; };
  }, [src, face, eyes]);
  return <canvas ref={canvas} width={384} height={384} role="img" aria-label={name} style={{ width: small ? 76 : 144, height: small ? 76 : 144, objectFit: "contain" }} />;
}
