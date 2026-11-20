export const CHAT_KING = {
  id: "chat-king-2026",
  start: Date.parse("2026-12-01T00:00:00+09:00"),
  end: Date.parse("2026-12-11T00:00:00+09:00"),
  target: 1_000_000,
  trialDuration: 20 * 24 * 60 * 60 * 1000,
};

export function chatKingPhase(now: number) {
  if (now < CHAT_KING.start) return "upcoming";
  return now < CHAT_KING.end ? "active" : "ended";
}

export function chatKingMessagePath(path: unknown): path is string {
  return typeof path === "string" && /^(messages\/[^/]+|(group_rooms|meeting_rooms)\/[^/]+\/messages\/[^/]+)$/.test(path) && path.length <= 1500;
}

export function chatKingStatus(data: { count?: number; trialEndsAt?: number } | undefined, now: number) {
  const count = data?.count || 0;
  const trialEndsAt = data?.trialEndsAt || null;
  return { count, target: CHAT_KING.target, phase: chatKingPhase(now), trialEndsAt,
    trialActive: trialEndsAt !== null && now < trialEndsAt,
    progress: Math.min(100, count / CHAT_KING.target * 100) };
}

export function nextChatKingProgress(data: { count?: number; trialEndsAt?: number; trialStartedAt?: number } | undefined, now: number) {
  const count = (data?.count || 0) + 1;
  const trialEndsAt = data?.trialEndsAt || (count >= CHAT_KING.target ? now + CHAT_KING.trialDuration : null);
  return { count, ...(trialEndsAt ? { trialEndsAt, trialStartedAt: data?.trialStartedAt || now } : {}) };
}
