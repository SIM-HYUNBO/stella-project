type Message = { id: string; content: string; sessionId?: string; createdAt?: { toMillis?: () => number } | null };
export function buildConversations(messages: Message[], titles: Record<string, string>) {
  const groups = new Map<string, { id: string; title: string; preview: string; time: number }>();
  for (const message of messages) {
    const id = message.sessionId || "legacy";
    const timestamp = message.createdAt?.toMillis?.();
    const time = typeof timestamp === "number" && Number.isFinite(timestamp) ? timestamp : 0;
    const existing = groups.get(id);
    if (!existing) groups.set(id, { id, title: titles[id] || message.content.slice(0, 32) || "이전 대화", preview: message.content, time });
    else { existing.preview = message.content; existing.time = Math.max(existing.time, time); }
  }
  return Array.from(groups.values()).sort((a, b) => b.time - a.time || a.id.localeCompare(b.id));
}

export function conversationDay(time: number, now: Date): "오늘" | "어제" | "이전" {
  if (!Number.isFinite(time) || time <= 0) return "이전";
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (time >= +today && time < +tomorrow) return "오늘";
  if (time >= +yesterday && time < +today) return "어제";
  return "이전";
}
