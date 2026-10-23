import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { apiUser, apiRateLimit, ApiError } from "@/lib/api-user";

export const runtime = "nodejs";
export const maxDuration = 120;
const validId = (s: unknown): s is string => typeof s === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(s);
const failure = (e: unknown) => NextResponse.json({ error: e instanceof ApiError ? e.message : "이미지를 만들지 못했어. 잠시 후 다시 시도해 줘." }, { status: e instanceof ApiError ? e.status : 500 });

export async function GET(req: NextRequest) {
  try {
    const { db, uid } = await apiUser(req);
    const id = req.nextUrl.searchParams.get("id");
    if (!validId(id)) throw new ApiError(400, "이미지 주소를 확인해 줘.");
    const ref = db.collection("robotImageAssets").doc(uid).collection("images").doc(id);
    const meta = (await ref.get()).data();
    if (meta?.status !== "ready" || !Number.isInteger(meta.parts) || meta.parts < 1 || meta.parts > 12) throw new ApiError(404, "저장된 이미지를 찾지 못했어.");
    const pieces = await Promise.all(Array.from({ length: meta.parts }, (_, i) => ref.collection("parts").doc(String(i)).get()));
    if (pieces.some(p => typeof p.data()?.data !== "string")) throw new ApiError(500, "이미지를 불러오지 못했어.");
    const bytes = Buffer.from(pieces.map(p => p.data().data).join(""), "base64");
    return new Response(bytes, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": 'inline; filename="wagie-image.jpg"' } });
  } catch (e) { return failure(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { db, uid } = await apiUser(req);
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!validId(sessionId)) throw new ApiError(400, "삭제할 대화를 확인해 줘.");
    const images = await db.collection("robotImageAssets").doc(uid).collection("images").where("sessionId", "==", sessionId).get();
    if (images.docs.some(d => d.data().status === "pending")) throw new ApiError(409, "생성 결과를 확인 중인 이미지가 있어. 잠시 후 삭제해 줘.");
    await Promise.all(images.docs.map(d => db.recursiveDelete(d.ref)));
    return NextResponse.json({ ok: true });
  } catch (e) { return failure(e); }
}

export async function POST(req: NextRequest) {
  try {
    const { db, admin, uid } = await apiUser(req);
    const { prompt, sessionId, requestId } = await req.json();
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 2000 || !validId(sessionId) || !validId(requestId)) throw new ApiError(400, "원하는 그림을 2,000자 이내로 설명해 줘.");
    if (!process.env.OPENAI_API_KEY) throw new ApiError(503, "이미지 생성 연결을 아직 준비 중이야. 잠시 후 다시 시도해 줘.");
    const ref = db.collection("robotImageAssets").doc(uid).collection("images").doc(requestId);
    const signature = createHash("sha256").update(JSON.stringify([prompt.trim(), sessionId])).digest("hex");
    // The same request ID never calls the paid provider a second time.
    const existing = (await ref.get()).data();
    if (existing) {
      if (existing.signature !== signature) throw new ApiError(409, "새 이미지 요청으로 다시 시작해 줘.");
      if (existing.status === "ready") return NextResponse.json({ id: requestId, sessionId });
      throw new ApiError(409, existing.status === "failed" ? "이 이미지 요청은 완료하지 못했어. 새 요청으로 다시 만들어 줘." : "이 그림은 아직 생성 중이거나 결과 확인 중이야. 잠시 후 같은 요청으로 확인해 줘.");
    }
    await apiRateLimit(db, uid, "image", 2);
    await db.runTransaction(async tx => {
      if ((await tx.get(ref)).exists) throw new ApiError(409, "이미 처리 중인 이미지 요청이야.");
      tx.set(ref, { signature, status: "pending", sessionId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(100000),
        body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare", prompt: prompt.trim(), n: 1, size: "1024x1024", quality: "medium", output_format: "jpeg", output_compression: 70, safety_identifier: createHash("sha256").update(uid).digest("hex") }),
      });
    } catch { throw new ApiError(504, "생성 결과를 확인하지 못했어. 중복 생성하지 않도록 이 요청은 다시 결제하지 않아."); }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      await ref.update({ status: "failed" });
      const code = data.error?.code || "";
      if (code === "content_policy_violation" || code === "moderation_blocked") throw new ApiError(400, "이 설명으로는 그림을 만들 수 없어. 내용을 바꿔서 요청해 줘.");
      if (response.status === 429) throw new ApiError(429, "이미지 생성 사용량이나 결제 설정을 확인해야 해. 잠시 후 다시 시도해 줘.");
      if ([401, 403, 404].includes(response.status)) throw new ApiError(503, "이미지 생성 서비스의 키·모델 권한을 확인해야 해.");
      throw new ApiError(502, "이미지 생성 서비스가 응답하지 못했어. 잠시 후 다시 시도해 줘.");
    }
    const result = await response.json();
    const data = result.data?.[0]?.b64_json;
    if (typeof data !== "string" || !/^[A-Za-z0-9+/]+=*$/.test(data) || data.length > 5500000 || !Buffer.from(data, "base64").subarray(0, 3).equals(Buffer.from([255, 216, 255]))) throw new ApiError(502, "생성된 이미지 형식을 확인하지 못했어.");
    const parts = Math.ceil(data.length / 500000);
    const messages = db.collection("robotChats").doc(uid).collection("messages");
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    for (let i = 0; i < parts; i++) batch.set(ref.collection("parts").doc(String(i)), { data: data.slice(i * 500000, (i + 1) * 500000) });
    batch.set(ref, { signature, status: "ready", sessionId, parts, createdAt: timestamp });
    batch.set(messages.doc(`image_${requestId}_prompt`), { role: "user", content: prompt.trim(), sessionId, createdAt: timestamp });
    batch.set(messages.doc(`image_${requestId}_result`), { role: "assistant", content: "요청한 이미지를 만들었어.", sessionId, generatedImage: { id: requestId, prompt: prompt.trim() }, createdAt: timestamp });
    await batch.commit();
    return NextResponse.json({ id: requestId, sessionId });
  } catch (e) { return failure(e); }
}
