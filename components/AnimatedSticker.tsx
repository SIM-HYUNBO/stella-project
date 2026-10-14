import { STICKER_MOTIONS } from "@/lib/custom-stickers";
import styles from "./AnimatedSticker.module.css";

export default function AnimatedSticker({ src, motion, small = false, name = "직접 만든 이모티콘" }: { src: string; motion?: string; small?: boolean; name?: string }) {
  const selected = STICKER_MOTIONS.find(item => item.id === motion)?.id || "still";
  return <span className={styles.frame}><img src={src} alt={name} draggable={false}
    className={`${styles.image} ${small ? styles.small : ""} ${styles[selected] || ""}`} /></span>;
}
