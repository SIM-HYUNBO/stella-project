/** Normalize stored display punctuation without guessing missing digits. */
export function normalizePhone(value: unknown): string {
  if (typeof value !== "string") return "";
  const text = value.normalize("NFKC").trim();
  if (!/^\+?[\d\s().\-–—]+$/.test(text)) return "";
  const phone = text.replace(/[\s().\-–—]/g, "");
  return /^\+?\d{7,15}$/.test(phone) ? phone : "";
}

export function formatPhone(phone: string): string {
  if (/^010\d{8}$/.test(phone)) return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  return phone;
}
