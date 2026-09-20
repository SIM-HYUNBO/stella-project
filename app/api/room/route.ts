import { NextRequest, NextResponse } from "next/server";
import getAdmin from "@/lib/firebaseAdmin";
import { EMPTY_ROOM, validId, validLetter, validateRoom, letterAccess } from "@/lib/room";

export const dynamic = "force-dynamic";
const answer = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
class Failure extends Error { constructor(public status: number, message: string) { super(message); } }
async function context(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) throw new Failure(503, "우편함을 준비하지 못했어. 잠시 후 다시 들어와 줘.");
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new Failure(401, "로그인이 필요해.");
  try { const user = await admin.auth().verifyIdToken(token); return { admin, db: admin.firestore(), uid: user.uid }; }
  catch { throw new Failure(401, "로그인이 만료됐어. 다시 로그인해 줘."); }
}
function fail(error: unknown) { return error instanceof Failure ? answer({ error: error.message }, error.status) : answer({ error: "처리하지 못했어. 연결을 확인하고 다시 시도해 줘." }, 500); }

export async function GET(req: NextRequest) {
  try {
    const { db, uid } = await context(req);
    const [profile, room, incoming, relationships] = await Promise.all([
      db.collection("users").doc(uid).get(), db.collection("privateRooms").doc(uid).get(),
      db.collection("roomLetters").where("toUid", "==", uid).get(),
      db.collection("friends").where("users", "array-contains", uid).get(),
    ]);
    const ids = Array.from(new Set<string>(relationships.docs.flatMap(d => (d.data().users || []).filter((v: string) => v !== uid))));
    const users = await Promise.all(ids.map(id => db.collection("users").doc(id).get()));
    const now = Date.now();
    const mail = incoming.docs.map(d => {
      const m = d.data();
      return { id: d.id, fromName: m.fromName, toName: m.toName, createdAt: m.createdAt, unlockAt: m.unlockAt, opened: m.opened === true,
        ...(m.opened && m.unlockAt <= now ? { image: m.image, text: m.text } : {}) };
    }).sort((a, b) => b.createdAt - a.createdAt);
    return answer({ nickname: profile.data()?.nickname || "나", room: room.data()?.layout || EMPTY_ROOM, mail,
      friends: users.filter(d => d.exists).map(d => ({ uid: d.id, nickname: d.data()?.nickname || "친구" })) });
  } catch (error) { return fail(error); }
}

export async function POST(req: NextRequest) {
  try {
    const { db, admin, uid } = await context(req);
    const raw = await req.text();
    if (raw.length > 700000) throw new Failure(413, "편지가 너무 커. 사진 크기를 줄여 줘.");
    let body;
    try { body = JSON.parse(raw); } catch { throw new Failure(400, "요청 내용을 확인해 줘."); }
    if (body.action === "saveRoom") {
      if (!validateRoom(body.room)) throw new Failure(400, "소품과 편지는 총 20개까지 놓을 수 있어.");
      const pins = await Promise.all(body.room.pins.map((p: { id: string }) => db.collection("roomLetters").doc(p.id).get()));
      if (pins.some(p => p.data()?.toUid !== uid || !p.data()?.opened || p.data()?.unlockAt > Date.now())) throw new Failure(403, "직접 받은 편지를 연 뒤에 붙일 수 있어.");
      await db.collection("privateRooms").doc(uid).set({ layout: body.room }, { merge: true });
      return answer({ ok: true });
    }
    if (body.action === "open") {
      if (!validId(body.id)) throw new Failure(400, "편지 주소를 확인해 줘.");
      const ref = db.collection("roomLetters").doc(body.id);
      const letter = await db.runTransaction(async tx => {
        const snap = await tx.get(ref); const m = snap.data();
        const access = letterAccess(m as { toUid: string; unlockAt: number } | undefined, uid, Date.now());
        if (access === "missing") throw new Failure(404, "편지를 찾을 수 없어.");
        if (access === "locked") throw new Failure(403, "아직 편지를 열 시간이 아니야.");
        tx.update(ref, { opened: true });
        return { id: snap.id, fromName: m.fromName, toName: m.toName, createdAt: m.createdAt, unlockAt: m.unlockAt, opened: true, image: m.image, text: m.text };
      });
      return answer({ letter });
    }
    if (body.action !== "send" || !validId(body.id) || !validId(body.toUid) || body.toUid === uid || !validLetter(body, Date.now())) throw new Failure(400, "받을 친구와 편지 내용을 다시 확인해 줘.");
    const relationships = await db.collection("friends").where("users", "array-contains", uid).get();
    if (!relationships.docs.some(d => d.data().users?.includes(body.toUid))) throw new Failure(403, "친구에게만 편지를 보낼 수 있어.");
    const [from, to] = await Promise.all([db.collection("users").doc(uid).get(), db.collection("users").doc(body.toUid).get()]);
    if (!from.exists || !to.exists) throw new Failure(404, "친구를 찾을 수 없어.");
    const ref = db.collection("roomLetters").doc(body.id);
    const fromName = from.data()?.nickname || "친구";
    const toName = to.data()?.nickname || "친구";
    // The same draft ID is reused on retries, so a lost response cannot duplicate mail.
    const created = await db.runTransaction(async tx => {
      const existing = await tx.get(ref);
      if (existing.exists) {
        if (existing.data()?.fromUid !== uid || existing.data()?.toUid !== body.toUid) throw new Failure(409, "편지를 새로 작성해 줘.");
        return false;
      }
      const recentRef = db.collection("privateRooms").doc(uid);
      const recent = await tx.get(recentRef);
      if (Date.now() - (recent.data()?.lastSentAt || 0) < 5000) throw new Failure(429, "조금만 기다렸다가 다음 편지를 보내 줘.");
      tx.set(ref, { fromUid: uid, toUid: body.toUid, fromName, toName, image: body.image, text: body.text.trim(), unlockAt: body.unlockAt, createdAt: Date.now(), opened: false });
      tx.set(recentRef, { lastSentAt: Date.now() }, { merge: true });
      return true;
    });
    if (created) {
      const title = "낙서 우편함에 편지가 도착했어";
      const message = `${fromName}님이 편지를 보냈어요 💌`;
      // Mail remains delivered even if the receiver has disabled push notifications.
      await Promise.allSettled([
        db.collection("notifications").doc(toName).collection("items").doc(body.id).set({ title, message, from: fromName, url: "/my-room", read: false, createdAt: admin.firestore.FieldValue.serverTimestamp() }),
        (async () => {
          const token = (await db.collection("fcm_tokens").doc(toName).get()).data()?.token;
          if (token) await admin.messaging().send({ token, data: { title, body: message, url: "/my-room" }, webpush: { notification: { title, body: message, icon: "/wag.png", tag: `letter-${body.id}` }, fcmOptions: { link: "/my-room" } }, android: { notification: { title, body: message } }, apns: { payload: { aps: { alert: { title, body: message }, sound: "default" } } } });
        })(),
      ]);
    }
    return answer({ ok: true });
  } catch (error) { return fail(error); }
}
