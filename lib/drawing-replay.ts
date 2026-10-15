export type DrawingPoint = { x: number; y: number };
export type DrawingStroke = { color: string; width: number; points: DrawingPoint[] };
export const MAX_DRAWING_POINTS = 4096;

export function validDrawing(value: unknown): value is DrawingStroke[] {
  if (!Array.isArray(value) || !value.length || value.length > 128) return false;
  let count = 0;
  return value.every(stroke => {
    if (!stroke || !/^#[0-9a-f]{6}$/i.test(stroke.color) || !Number.isFinite(stroke.width) || stroke.width < 1 || stroke.width > 56 || !Array.isArray(stroke.points) || !stroke.points.length) return false;
    count += stroke.points.length;
    return count <= MAX_DRAWING_POINTS && stroke.points.every((point: DrawingPoint) => Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= 900 && point.y >= 0 && point.y <= 600);
  });
}

export function packDrawing(strokes: DrawingStroke[]): DrawingStroke[] {
  if (strokes.length > 128) throw Error("획이 너무 많아. 조금 간단하게 그려 줘.");
  const total = strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);
  const step = Math.max(1, Math.ceil(total / (MAX_DRAWING_POINTS - strokes.length * 2)));
  return strokes.map(stroke => ({ ...stroke, points: stroke.points.filter((_, index) => index === 0 || index === stroke.points.length - 1 || index % step === 0) }));
}

export function paintDrawingPoint(context: CanvasRenderingContext2D, stroke: DrawingStroke, index: number) {
  const point = stroke.points[index];
  if (!point) return;
  context.strokeStyle = stroke.color; context.fillStyle = stroke.color;
  context.lineWidth = stroke.width; context.lineCap = "round"; context.lineJoin = "round";
  context.beginPath();
  if (index === 0) { context.arc(point.x, point.y, stroke.width / 2, 0, Math.PI * 2); context.fill(); }
  else { const previous = stroke.points[index - 1]; context.moveTo(previous.x, previous.y); context.lineTo(point.x, point.y); context.stroke(); }
}
