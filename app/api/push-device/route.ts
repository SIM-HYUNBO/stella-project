import { NextRequest, NextResponse } from "next/server";
import { apiUser, apiRateLimit, ApiError } from "@/lib/api-user";
export async function POST(req: NextRequest) {
  try {
    const { db, uid, nickname, admin } = await apiUser(req);
    await apiRateLimit(db, uid, "push-device", 30);
    const raw = await req.text();
    if (raw.length > 4096) throw new ApiError(400, "알림 등록 정보를 확인해 줘.");
    const { token } = JSON.parse(raw);
    if (typeof token !== "string" || token.length < 20 || token.length > 2048 || /\s/.test(token)) throw new ApiError(400, "알림 등록 정보를 확인해 줘.");
    // A shared device must stop receiving the previous account's messages.
    const previous = await db.collection("fcm_tokens").where("androidToken", "==", token).get();
    const batch = db.batch();
    previous.docs.filter(item => item.id !== nickname).forEach(item => batch.update(item.ref, { androidToken: admin.firestore.FieldValue.delete() }));
    batch.set(db.collection("fcm_tokens").doc(nickname), { uid, androidToken: token, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof ApiError ? e.message : "알림을 등록하지 못했어." }, { status: e instanceof ApiError ? e.status : 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { db, uid, nickname, admin } = await apiUser(req);
    const ref = db.collection("fcm_tokens").doc(nickname);
    await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (current?.uid === uid) tx.update(ref, { androidToken: admin.firestore.FieldValue.delete() });
    });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: false }, { status: 500 }); }
}
