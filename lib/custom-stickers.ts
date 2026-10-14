export const STICKER_MOTIONS = [
  { id: "bounce", label: "통통" },
  { id: "wiggle", label: "흔들흔들" },
  { id: "pulse", label: "두근두근" },
  { id: "float", label: "둥실둥실" },
  { id: "spin", label: "빙글빙글" },
  { id: "still", label: "가만히" },
] as const;

export type StickerMotion = typeof STICKER_MOTIONS[number]["id"];
export type CustomSticker = { id: string; name: string; image: string; motion: StickerMotion };
export const MAX_STICKERS = 16;
export const MAX_STICKER_IMAGE = 32000;

export function isCustomSticker(value: unknown): value is CustomSticker {
  if (!value || typeof value !== "object") return false;
  const sticker = value as CustomSticker;
  return typeof sticker.id === "string" && typeof sticker.name === "string" && sticker.name.length <= 24
    && typeof sticker.image === "string" && sticker.image.length <= MAX_STICKER_IMAGE
    && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(sticker.image)
    && STICKER_MOTIONS.some(motion => motion.id === sticker.motion);
}
