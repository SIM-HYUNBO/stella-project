import { NextRequest, NextResponse } from "next/server";
import { apiUser, ApiError, apiRateLimit } from "@/lib/api-user";
import { sendUserPush } from "@/lib/push-delivery";

export async function POST(req: NextRequest) {
  try {
    const { idToken, title, message, targetNicknames } = await req.json();
    const { admin, db, uid, claims } = await apiUser(req, idToken);
    if (claims.admin !== true && !(process.env.ADMIN_UIDS || "").split(",").map(value => value.trim()).includes(uid)) throw new ApiError(403, "공지 발송 권한이 없어.");
    if (typeof message !== "string" || !message.trim() || message.length > 500 ||
      (title !== undefined && (typeof title !== "string" || title.length > 80)) ||
      (targetNicknames !== undefined && (!Array.isArray(targetNicknames) || targetNicknames.length > 500 || targetNicknames.some(name => typeof name !== "string" || !name || name.includes("/"))))) throw new ApiError(400, "공지 내용을 확인해 줘.");
    await apiRateLimit(db, uid, "broadcast", 3);
    const selected = new Set<string>(targetNicknames);
    const registrations = await db.collection("fcm_tokens").get();
    const targets = registrations.docs.filter(doc => !selected.size || selected.has(doc.id));
    const subject = title?.trim() || "📢 공지";
    const url = "/home";
    let sent = 0, failed = selected.size ? selected.size - targets.length : 0;
    for (let i = 0; i < targets.length; i += 20) {
      await Promise.all(targets.slice(i, i + 20).map(async target => {
        try {
          const users = await db.collection("users").where("nickname", "==", target.id).limit(1).get();
          if (users.empty || users.docs[0].data().pushEnabled === false) return;
          const status = await sendUserPush(db, admin.messaging(), target.id, {
            data: { title: subject, body: message, url },
            webpush: { notification: { title: subject, body: message, icon: "/wag.png", data: { url } } },
            android: { notification: { title: subject, body: message } },
          });
          if (status === "sent") sent++; else failed++;
        } catch { failed++; }
      }));
    }
    await db.collection("announcements").add({ title: subject, message, sentTo: sent, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return NextResponse.json({ ok: true, sent, failed });
  } catch (e) {
    return NextResponse.json({ error: e instanceof ApiError ? e.message : "공지를 보내지 못했어." }, { status: e instanceof ApiError ? e.status : 500 });
  }
}
