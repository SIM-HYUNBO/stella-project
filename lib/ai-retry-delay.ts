export function aiRetrySeconds(header: string | null, message = "", now = Date.now()): number | null {
  if (header) {
    const numeric = Number(header);
    if (Number.isFinite(numeric) && numeric >= 0) return Math.ceil(numeric);
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, Math.ceil((date - now) / 1000));
  }
  const duration = message.match(/try again in\s+((?:\d+(?:\.\d+)?\s*(?:ms|[dhms])\s*)+)/i)?.[1];
  if (!duration) return null;
  const factors: Record<string, number> = { d: 86400, h: 3600, m: 60, s: 1, ms: 0.001 };
  let seconds = 0;
  for (const match of Array.from(duration.matchAll(/(\d+(?:\.\d+)?)\s*(ms|[dhms])/g))) seconds += Number(match[1]) * factors[match[2]];
  return Math.ceil(seconds);
}
