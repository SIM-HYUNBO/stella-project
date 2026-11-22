"use client";
/* eslint-disable @next/next/no-img-element -- Chat photo data URLs. */
export default function PhotoAlbum({ images, onOpen }: { images: string[]; onOpen: (src: string) => void }) {
  return <div className={`grid gap-1 w-[min(270px,65vw)] overflow-hidden rounded-2xl ${images.length === 2 || images.length === 4 ? "grid-cols-2" : "grid-cols-3"}`}>
    {images.slice(0, 9).map((src, index) => <button key={index} type="button" aria-label={`사진 ${index + 1}/${images.length} 확대`} onClick={e => { e.stopPropagation(); onOpen(src); }} className="aspect-square overflow-hidden bg-white/50"><img src={src} alt={`사진 ${index + 1}`} className="w-full h-full object-cover" /></button>)}
  </div>;
}
