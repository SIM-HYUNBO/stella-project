import { NextResponse } from "next/server";
import { apiUser, ApiError } from "@/lib/api-user";
export async function POST(req: Request) {
  try {
    const { db, nickname, admin } = await apiUser(req);
    const body = await req.json();
    const { kind, id } = body;
    if (!["draw", "story"].includes(kind) || typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new ApiError(400, "작품 주소를 확인해 줘.");
    const request = db.collection(`${kind}_requests`).doc(id);
    const data = (await request.get()).data();
    if (!data || ![data.from, data.to].includes(nickname)) throw new ApiError(403, "참여한 작품만 종료할 수 있어.");
    if (!["accepted", "ended"].includes(data.status)) throw new ApiError(409, "진행 중인 작품이 아니야.");
    if (typeof data.sessionId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(data.sessionId)) throw new ApiError(400, "작품 주소를 확인해 줘.");
    if (body.action === "stroke") {
      const s = body.stroke;
      if (kind !== "draw" || !/^[a-zA-Z0-9_-]{1,128}$/.test(body.strokeId || "") || !s || !/^#[a-f0-9]{6}$/i.test(s.color) || !Number.isFinite(s.size) || s.size < 1 || s.size > 64 || !Array.isArray(s.points) || s.points.length < 2 || s.points.length > 4096 || s.points.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1200 || p.y < 0 || p.y > 800)) throw new ApiError(400, "그림 데이터를 확인해 줘.");
      await db.runTransaction(async tx => {
        const current = (await tx.get(request)).data();
        if (current?.status !== "accepted" || ![current.from, current.to].includes(nickname)) throw new ApiError(409, "이미 끝난 그림이야.");
        tx.set(db.collection("draw_sessions").doc(data.sessionId).collection("strokes").doc(body.strokeId), { by: nickname, color: s.color, size: s.size, points: s.points, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      });
      return NextResponse.json({ ok: true });
    }
    // Both clients observe this status. Keep it ended even if cleanup needs a retry.
    await request.update({ status: "ended" });
    if (kind === "draw") await db.recursiveDelete(db.collection("draw_sessions").doc(data.sessionId));
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e instanceof ApiError ? e.message : "종료하지 못했어. 다시 시도해 줘." }, { status: e instanceof ApiError ? e.status : 500 }); }
}
