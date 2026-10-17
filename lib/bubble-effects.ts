export const BUBBLE_EFFECTS = [
  { id: "none", label: "기본" },
  { id: "fade", label: "사르르" },
  { id: "pop", label: "통통" },
  { id: "shake", label: "흔들흔들" },
] as const;

export type BubbleEffect = typeof BUBBLE_EFFECTS[number]["id"];

export function bubbleEffect(value: unknown): BubbleEffect {
  return BUBBLE_EFFECTS.find(effect => effect.id === value)?.id || "none";
}
