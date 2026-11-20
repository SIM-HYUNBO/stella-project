import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { apiUser, ApiError } from "@/lib/api-user";
import { CHAT_KING, chatKingPhase, chatKingStatus, chatKingMessagePath, nextChatKingProgress } from "@/lib/chat-king";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
const failure = (error: unknown) => json({ error: error instanceof ApiError ? error.message : "이벤트 정보를 불러오지 못했어. 다시 시도해 줘." }, error instanceof ApiError ? error.status : 500);

export async function GET(req: NextRequest) {
  try {
    const { db, uid } = await apiUser(req);
    const participant = await db.collection("events").doc(CHAT_KING.id).collection("participants").doc(uid).get();
    return json(chatKingStatus(participant.data(), Date.now()));
  } catch (error) { return failure(error); }
}

export async function POST(req: NextRequest) {
  try {
    const { db, uid } = await apiUser(req);
    const raw = await req.text();
    if (raw.length > 2000) throw new ApiError(400, "메시지 주소를 확인해 줘.");
    let path: unknown;
    try { path = JSON.parse(raw).path; } catch { throw new ApiError(400, "메시지 주소를 확인해 줘."); }
    if (!chatKingMessagePath(path)) throw new ApiError(400, "집계할 수 없는 메시지야.");
    const messageRef = db.doc(path);
    const participantRef = db.collection("events").doc(CHAT_KING.id).collection("participants").doc(uid);
    const receiptRef = participantRef.collection("messages").doc(createHash("sha256").update(path).digest("hex"));
    const status = await db.runTransaction(async tx => {
      const now = Date.now();
      const [message, receipt, participant] = await Promise.all([tx.get(messageRef), tx.get(receiptRef), tx.get(participantRef)]);
      const data = participant.data();
      if (receipt.exists) return chatKingStatus(data, now);
      const m = message.data();
      if (!m) throw new ApiError(404, "메시지를 찾지 못했어.");
      if (m.fromUid !== uid) throw new ApiError(403, "내가 보낸 메시지만 집계할 수 있어.");
      const sentAt = m.createdAt?.toMillis?.();
      if (typeof sentAt !== "number" || sentAt > now || chatKingPhase(sentAt) !== "active" || ["system", "urgent"].includes(m.type)) {
        return chatKingStatus(data, now);
      }
      // Late receipts for messages sent during the event remain eligible after it closes.
      const next = nextChatKingProgress(data, now);
      tx.create(receiptRef, { path, sentAt });
      tx.set(participantRef, next, { merge: true });
      return chatKingStatus(next, now);
    });
    return json(status);
  } catch (error) { return failure(error); }
}
