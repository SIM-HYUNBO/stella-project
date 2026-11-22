export type ForwardedItem = { from: string; content: string; type: "text" | "image"; sentAt: number; spoiler: boolean };
export type ForwardSource = { id: string; from: string; content: string; type?: string; createdAt?: { toMillis?: () => number }; spoiler?: boolean };
export function bundleItems(messages: ForwardSource[], selected: Set<string>): ForwardedItem[] {
  const items = messages.filter(m => selected.has(m.id) && (!m.type || m.type === "text" || m.type === "image"))
    .map(m => ({ from: m.from, content: m.content, type: (m.type === "image" ? "image" : "text") as "text" | "image", sentAt: m.createdAt?.toMillis?.() || 0, spoiler: m.spoiler === true }));
  if (!items.length) throw Error("전달할 메시지를 골라 줘.");
  if (items.length > 30) throw Error("한 번에 30개까지 묶을 수 있어.");
  if (new TextEncoder().encode(JSON.stringify(items)).length > 850_000) throw Error("사진 용량이 커. 몇 개로 나눠서 보내 줘.");
  return items;
}
export function readBundle(value: unknown): ForwardedItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).filter((m): m is ForwardedItem => m && typeof m.from === "string" && typeof m.content === "string" && ["text", "image"].includes(m.type));
}
