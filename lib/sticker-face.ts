import type { FacePose, EyePoint } from "./custom-stickers";

type Point = { x: number; y: number };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const center = (points: Point[]) => ({ x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length });

export function landmarkPose(left: Point[], right: Point[], nose: Point, t: number): FacePose | null {
  if (left.length !== 6 || right.length !== 6) return null;
  if (![...left, ...right, nose].every(p => p && Number.isFinite(p.x) && Number.isFinite(p.y))) return null;
  const a = center(left), b = center(right), width = distance(a, b);
  if (width < 5) return null;
  const eye = (p: Point[]) => clamp(((distance(p[1], p[5]) + distance(p[2], p[4])) / (2 * Math.max(1, distance(p[0], p[3]))) - 0.12) / 0.13, 0, 1);
  return { t, x: clamp(-((nose.x - (a.x + b.x) / 2) / width) * 2, -1, 1), y: clamp((nose.y - (a.y + b.y) / 2) / width - 0.65, -1, 1),
    roll: clamp(-Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, -35, 35), left: eye(right), right: eye(left) };
}

export function paintStickerFace(canvas: HTMLCanvasElement, image: HTMLImageElement, pose: FacePose, eyes: [EyePoint, EyePoint]) {
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h); ctx.save();
  ctx.translate(w / 2 + pose.x * w * 0.06, h / 2 + pose.y * h * 0.06); ctx.rotate(pose.roll * Math.PI / 180); ctx.scale(0.8, 0.8); ctx.translate(-w / 2, -h / 2);
  const patches = eyes.map(p => ({ x: (p.x - 0.065) * w, y: (p.y - 0.055) * h, w: w * 0.13, h: h * 0.11 }));
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h);
  patches.forEach(p => ctx.rect(p.x, p.y, p.w, p.h)); ctx.clip("evenodd"); ctx.drawImage(image, 0, 0, w, h); ctx.restore();
  patches.forEach((p, i) => {
    const openness = Math.max(0.09, i ? pose.right : pose.left), height = p.h * openness;
    ctx.drawImage(image, p.x * image.naturalWidth / w, p.y * image.naturalHeight / h, p.w * image.naturalWidth / w, p.h * image.naturalHeight / h, p.x, p.y + (p.h - height) / 2, p.w, height);
  });
  ctx.restore();
}
