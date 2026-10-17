export const STICKER_MOTIONS = [
  { id: "bounce", label: "통통" },
  { id: "wiggle", label: "흔들흔들" },
  { id: "pulse", label: "두근두근" },
  { id: "float", label: "둥실둥실" },
  { id: "spin", label: "빙글빙글" },
  { id: "still", label: "가만히" },
] as const;

export type StickerMotion = typeof STICKER_MOTIONS[number]["id"];
export type StickerVoice = { data: string; duration: number };
export type FacePose = { t: number; x: number; y: number; roll: number; left: number; right: number };
export type EyePoint = { x: number; y: number };
export type StickerFace = { duration: number; frames: FacePose[]; eyes: [EyePoint, EyePoint] };
export type CustomSticker = { id: string; name: string; image: string; motion: StickerMotion; voice?: StickerVoice; face?: StickerFace };
export const MAX_STICKERS = 16;
export const MAX_STICKER_IMAGE = 32000;
export const MAX_STICKER_VOICE_SECONDS = 6;
export const MAX_STICKER_VOICE_DATA = 160000;
export const MAX_STICKER_LIBRARY_DATA = 480000;
export const STICKER_VOICE_EVENT = "wagie:sticker-voice";

export function isStickerFace(value: unknown): value is StickerFace {
  if (!value || typeof value !== "object") return false;
  const face = value as StickerFace;
  return Number.isFinite(face.duration) && face.duration >= 0.5 && face.duration <= 6.5
    && Array.isArray(face.eyes) && face.eyes.length === 2 && face.eyes.every(p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0.08 && p.x <= 0.92 && p.y >= 0.08 && p.y <= 0.92)
    && Array.isArray(face.frames) && face.frames.length >= 2 && face.frames.length <= 80
    && face.frames.every((p, i) => p && [p.t, p.x, p.y, p.roll, p.left, p.right].every(Number.isFinite)
      && p.t >= 0 && p.t <= face.duration && (!i || p.t > face.frames[i - 1].t)
      && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 && Math.abs(p.roll) <= 35 && p.left >= 0 && p.left <= 1 && p.right >= 0 && p.right <= 1);
}

export function isStickerVoice(value: unknown): value is StickerVoice {
  if (!value || typeof value !== "object") return false;
  const voice = value as StickerVoice;
  return Number.isFinite(voice.duration) && voice.duration > 0 && voice.duration <= MAX_STICKER_VOICE_SECONDS + 0.5
    && typeof voice.data === "string" && voice.data.length <= MAX_STICKER_VOICE_DATA
    && /^data:audio\/(?:webm|ogg|mp4|wav)(?:;codecs=[a-z0-9.,-]+)?;base64,[A-Za-z0-9+/]+=*$/i.test(voice.data);
}

export function isCustomSticker(value: unknown): value is CustomSticker {
  if (!value || typeof value !== "object") return false;
  const sticker = value as CustomSticker;
  return typeof sticker.id === "string" && typeof sticker.name === "string" && sticker.name.length <= 24
    && typeof sticker.image === "string" && sticker.image.length <= MAX_STICKER_IMAGE
    && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(sticker.image)
    && STICKER_MOTIONS.some(motion => motion.id === sticker.motion)
    && (sticker.voice === undefined || isStickerVoice(sticker.voice))
    && (sticker.face === undefined || isStickerFace(sticker.face));
}
