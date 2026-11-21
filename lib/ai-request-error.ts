export function aiRequestFailure(status: number, data: { error?: unknown; code?: unknown }) {
  const message = typeof data.error === "string" ? data.error : "서버가 오류 내용을 보내지 않았어.";
  if (status === 429) return message;
  const code = typeof data.code === "string" ? data.code.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) : "";
  const safe = message.replace(/(?:gsk_|sk-|AIza)[a-zA-Z0-9_-]+/g, "[키 숨김]").replace(/Bearer\s+\S+/gi, "[인증 정보 숨김]").slice(0, 350);
  return `AI 요청 오류 (HTTP ${status}${code ? ` · ${code}` : ""}) · ${safe}`;
}
