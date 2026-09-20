export const WALLS = ["#f5e8dc", "#e6eff5", "#eee6f5", "#e5eee5"];
export const STICKERS = ["🌼", "🧸", "🪴", "🎀", "⭐", "🐥", "🖼️", "☁️"];
export type Decoration = { id: string; emoji: string; x: number; y: number };
export type PinnedLetter = { id: string; x: number; y: number };
export type Room = { wall: string; decorations: Decoration[]; pins: PinnedLetter[] };
export const EMPTY_ROOM: Room = { wall: WALLS[0], decorations: [], pins: [] };
export const MAX_WALL_PINS = 2;
export function nextLetterPosition(pins: PinnedLetter[]) {
  const slots = [{ x: 58, y: 28 }, { x: 83, y: 28 }];
  return slots.find(slot => pins.every(p => Math.abs(p.x - slot.x) >= 25 || Math.abs(p.y - slot.y) >= 20)) || slots[pins.length % slots.length];
}
export type Mail = { id: string; fromName: string; toName: string; createdAt: number; unlockAt: number; opened: boolean; image?: string; text?: string };
export const validId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
export function letterAccess(letter: { toUid: string; unlockAt: number } | undefined, uid: string, now: number): "missing" | "locked" | "ready" {
  if (!letter || letter.toUid !== uid) return "missing";
  return Number.isFinite(letter.unlockAt) && letter.unlockAt <= now ? "ready" : "locked";
}
const position = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 8 && v <= 92;
export function validateRoom(value: Room): boolean {
  if (!value || !WALLS.includes(value.wall) || !Array.isArray(value.decorations) || !Array.isArray(value.pins) || value.decorations.length + value.pins.length > 20) return false;
  const items = [...value.decorations, ...value.pins];
  return items.every(i => i && validId(i.id) && position(i.x) && position(i.y)) && new Set(items.map(i => i.id)).size === items.length && value.decorations.every(d => STICKERS.includes(d.emoji));
}
export function validLetter(body: { image?: unknown; text?: unknown; unlockAt?: unknown }, now: number): boolean {
  return typeof body.image === "string" && body.image.length < 650000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(body.image)
    && typeof body.text === "string" && body.text.length <= 1000
    && typeof body.unlockAt === "number" && Number.isFinite(body.unlockAt) && body.unlockAt >= now - 300000 && body.unlockAt <= now + 30 * 86400000;
}
