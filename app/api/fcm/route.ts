import { NextRequest, NextResponse } from "next/server";
import { apiUser, apiRateLimit, ApiError } from "@/lib/api-user";

export async function POST(req: NextRequest) {
  try {
    const { admin, db, uid, nickname } = await apiUser(req);
    const { toNicknames, message, roomName, url } = await req.json();
    const targets = Array.from(new Set<string>(Array.isArray(toNicknames) ? toNicknames : [toNicknames]));
    if (!targets.length || targets.length > 50 || targets.some(n => typeof n !== "string" || !n || n.includes("/")) || typeof message !== "string" || message.length > 500 || (url && (typeof url !== "string" || !/^\/(?!\/)/.test(url)))) throw new ApiError(400, "알림 내용을 확인해 줘.");
    await apiRateLimit(db, uid, "push", 120);
    const friends = await db.collection("friends").where("users", "array-contains", uid).get();
    const friendIds = new Set(friends.docs.flatMap(d => d.data().users || []));
    const rooms = await Promise.all(["group_rooms", "meeting_rooms"].map(c => db.collection(c).where("members", "array-contains", nickname).get()));
    const members = new Set(rooms.flatMap(s => s.docs.flatMap(d => d.data().members || [])));
    const receivers = await Promise.all(targets.map(async name => {
      const people = await db.collection("users").where("nickname", "==", name).limit(1).get();
      const person = people.docs[0];
      if (!person) throw new ApiError(404, "받을 사람을 찾지 못했어.");
      let allowed = person.id !== uid && (friendIds.has(person.id) || members.has(name));
      if (!allowed && person.id !== uid) {
        const requests = await db.collection("friend_requests").where("from", "==", uid).where("to", "==", person.id).where("status", "==", "pending").limit(1).get();
        allowed = !requests.empty;
      }
      if (!allowed) throw new ApiError(403, "친구나 같은 방의 참여자에게만 알림을 보낼 수 있어.");
      return { name, profile: person.data() };
    }));
    const details = await Promise.all(receivers.map(async ({ name, profile }) => {
      const title = roomName ? `[${String(roomName).slice(0, 80)}] ${nickname}` : `${nickname}님의 메시지`;
      const link = url || "/home";
      // The inbox is independent from device permission and token availability.
      await db.collection("notifications").doc(name).collection("items").add({ from: nickname, title, message, url: link, createdAt: admin.firestore.FieldValue.serverTimestamp(), read: false });
      if (profile.pushEnabled === false) return { nickname: name, status: "disabled" };
      const ref = db.collection("fcm_tokens").doc(name), token = (await ref.get()).data()?.token;
      if (!token) return { nickname: name, status: "no_token" };
      try {
        await admin.messaging().send({ token, data: { title, body: message, url: link },
          webpush: { headers: { Urgency: "high" }, notification: { title, body: message, icon: "/wag.png", badge: "/wag.png", tag: `chat-${Date.now()}`, data: { url: link } }, fcmOptions: { link } },
          android: { priority: "high", notification: { title, body: message, sound: "alert1", defaultSound: false } },
          apns: { payload: { aps: { alert: { title, body: message }, sound: "default", contentAvailable: true } } },
        });
        return { nickname: name, status: "sent" };
      } catch (e: any) {
        if (["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(e?.code)) await db.runTransaction(async tx => { if ((await tx.get(ref)).data()?.token === token) tx.delete(ref); });
        return { nickname: name, status: "send_failed" };
      }
    }));
    return NextResponse.json({ ok: true, details });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof ApiError ? e.message : "알림을 보내지 못했어." }, { status: e instanceof ApiError ? e.status : 500 });
  }
}
