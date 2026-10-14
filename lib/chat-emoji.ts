/** Emoji-only messages, including flags, skin tones and joined families. */
export function isEmojiOnly(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  const emoji = new RegExp("(?:\\p{Regional_Indicator}{2}|[0-9#*]\\uFE0F?\\u20E3|\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})*(?:\\u200D\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})*)*)", "gu");
  const count = Array.from(value.matchAll(emoji)).length;
  return count >= 1 && count <= 4 && value.replace(emoji, "").replace(/\s/g, "") === "";
}
