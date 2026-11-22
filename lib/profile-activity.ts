const DAY = 86400000;
export function profileWeek(now = Date.now()) {
  const local = new Date(now + 9 * 3600000);
  const today = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - 9 * 3600000;
  return Array.from({ length: 7 }, (_, index) => {
    const start = today - (6 - index) * DAY;
    return { date: new Date(start + 9 * 3600000).toISOString().slice(0, 10), start, end: Math.min(start + DAY, now + 1) };
  });
}
export type ProfileActivity = { days: { date: string; count: number }[]; joinedAt: number | null };
