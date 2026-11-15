import { NextRequest, NextResponse } from "next/server";
import { apiUser, apiRateLimit, ApiError } from "@/lib/api-user";
export async function POST(req: NextRequest) {
  try {
    const { db, uid, nickname, admin } = await apiUser(req);
    await apiRateLimit(db, uid, "push-device", 30);
    const raw = await req.text();
    if (raw.length > 4096) throw new ApiError(400, "알림 등록 정보를 확인해 줘.");
    const { token, platform } = JSON.parse(raw);
    const field = platform === "web" ? "token" : "androidToken";
    if (typeof token !== "string" || token.length < 20 || token.length > 2048 || /\s/.test(token)) throw new ApiError(400, "알림 등록 정보를 확인해 줘.");
    // A shared device must stop receiving the previous account's messages.
    const registrations = db.collection("fcm_tokens");
    await db.runTransaction(async tx => {
      const previous = await tx.get(registrations.where(field, "==", token));
      previous.docs.filter(item => item.id !== nickname).forEach(item => tx.update(item.ref, { [field]: admin.firestore.FieldValue.delete() }));
      tx.set(registrations.doc(nickname), { uid, [field]: token, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof ApiError ? e.message : "알림을 등록하지 못했어." }, { status: e instanceof ApiError ? e.status : 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { db, uid, nickname, admin } = await apiUser(req);
    const { token } = await req.json().catch(() => ({}));
    if (typeof token !== "string" || !token || token.length > 2048) throw new ApiError(400, "알림 등록 정보를 확인해 줘.");
    const ref = db.collection("fcm_tokens").doc(nickname);
    await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      const fields = ["token", "androidToken"].filter(field => current?.uid === uid && current[field] === token);
      if (fields.length) tx.update(ref, Object.fromEntries(fields.map(field => [field, admin.firestore.FieldValue.delete()])));
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ ok: false }, { status: error instanceof ApiError ? error.status : 500 }); }
}
