import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import getAdmin from "@/lib/firebaseAdmin";
import { callExpired, isParticipant, validCallId, validDescription, type VideoCall } from "@/lib/video-call";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
class Failure extends Error { constructor(public status: number, message: string) { super(message); } }
async function context(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) throw new Failure(503, "통화 서버를 준비하지 못했어. 잠시 후 다시 시도해 줘.");
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new Failure(401, "로그인이 필요해.");
  try { const { uid } = await admin.auth().verifyIdToken(token); return { admin, db: admin.firestore(), uid }; }
  catch { throw new Failure(401, "다시 로그인해 줘."); }
}
const fail = (e: unknown) => e instanceof Failure ? json({ error: e.message }, e.status) : json({ error: "통화 서버에 연결하지 못했어. 잠시 후 다시 시도해 줘." }, 500);
function iceConfig(uid: string) {
  const iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  const urls = (process.env.WEBRTC_TURN_URLS || "").split(",").map(s => s.trim()).filter(s => /^turns?:[^\s]+$/.test(s));
  if (urls.length && process.env.WEBRTC_TURN_SECRET) {
    const username = `${Math.floor(Date.now() / 1000) + 10800}:${uid}`;
    iceServers.push({ urls, username, credential: createHmac("sha1", process.env.WEBRTC_TURN_SECRET).update(username).digest("base64") });
  }
  return { iceServers, relayConfigured: iceServers.length > 1 };
}

export async function GET(req: NextRequest) {
  try {
    const { db, uid } = await context(req);
    const requestedId = req.nextUrl.searchParams.get("id");
    const id = requestedId || (await db.collection("videoCallUsers").doc(uid).get()).data()?.callId;
    if (!id) return json({ call: null, uid });
    if (!validCallId(id)) throw new Failure(400, "잘못된 통화 주소야.");
    const ref = db.collection("videoCalls").doc(id);
    const call = await db.runTransaction(async tx => {
      const stored = (await tx.get(ref)).data() as VideoCall | undefined;
      if (!stored || !isParticipant(stored, uid)) throw new Failure(404, "참여할 수 없는 통화야.");
      const c = { ...stored, id };
      if (callExpired(c, Date.now())) {
        Object.assign(c, { status: "ended", reason: "timeout", offer: null, answer: null });
        tx.update(ref, { status: "ended", reason: "timeout", offer: null, answer: null });
      }
      // Only a tab owning this participant's media may keep an accepted call alive.
      const client = req.nextUrl.searchParams.get("client");
      const owner = uid === c.fromUid ? c.fromClient : c.toClient;
      if (c.status !== "ended" && client && owner === client) {
        const field = uid === c.fromUid ? "fromSeen" : "toSeen";
        c[field] = Date.now(); tx.update(ref, { [field]: c[field] });
      }
      return c;
    });
    return json({ call, uid, ...(requestedId ? iceConfig(uid) : {}) });
  } catch (e) { return fail(e); }
}

export async function POST(req: NextRequest) {
  try {
    const { db, uid, admin } = await context(req);
    const raw = await req.text();
    if (raw.length > 65000) throw new Failure(413, "통화 요청이 너무 커.");
    let body;
    try { body = JSON.parse(raw); } catch { throw new Failure(400, "요청을 확인해 줘."); }
    if (!body || !validCallId(body.id)) throw new Failure(400, "잘못된 통화 요청이야.");
    const ref = db.collection("videoCalls").doc(body.id);
    if (body.action === "create") {
      if (!validCallId(body.toUid) || body.toUid === uid) throw new Failure(400, "통화할 친구를 선택해 줘.");
      const friends = await db.collection("friends").where("users", "array-contains", uid).get();
      if (!friends.docs.some(d => d.data().users?.includes(body.toUid))) throw new Failure(403, "친구에게만 영상통화를 걸 수 있어.");
      const [from, to] = await Promise.all([db.collection("users").doc(uid).get(), db.collection("users").doc(body.toUid).get()]);
      if (!from.exists || !to.exists) throw new Failure(404, "친구 정보를 찾지 못했어.");
      const fromName = from.data()?.nickname || "친구", toName = to.data()?.nickname || "친구";
      const created = await db.runTransaction(async tx => {
        const existing = await tx.get(ref);
        if (existing.exists) {
          const c = existing.data();
          if (c.fromUid !== uid || c.toUid !== body.toUid) throw new Failure(403, "잘못된 통화 요청이야.");
          return false;
        }
        const own = db.collection("videoCallUsers").doc(uid), other = db.collection("videoCallUsers").doc(body.toUid);
        const slots = await Promise.all([tx.get(own), tx.get(other)]);
        const active = await Promise.all(slots.map(s => s.data()?.callId ? tx.get(db.collection("videoCalls").doc(s.data().callId)) : Promise.resolve(null)));
        if (active.some(s => s?.exists && s.data().status !== "ended" && !callExpired(s.data() as VideoCall, Date.now()))) throw new Failure(409, "이미 진행 중인 통화가 있어. 잠시 후 다시 걸어 줘.");
        if (Date.now() - (slots[0].data()?.lastCalledAt || 0) < 10000) throw new Failure(429, "조금만 기다렸다가 다시 걸어 줘.");
        tx.set(ref, { id: body.id, fromUid: uid, toUid: body.toUid, fromName, toName, status: "ringing", createdAt: Date.now(), fromSeen: Date.now(), toSeen: Date.now(), offer: null, answer: null, deleteAfter: new Date(Date.now() + 86400000) });
        tx.set(own, { callId: body.id, lastCalledAt: Date.now() });
        tx.set(other, { callId: body.id }, { merge: true });
        return true;
      });
      if (created) {
        // Invitation remains available in-app even if push is disabled or delivery fails.
        try {
          const token = (await db.collection("fcm_tokens").doc(toName).get()).data()?.token;
          const url = `/video-call/${body.id}`;
          if (token) await admin.messaging().send({ token, data: { url, title: "영상통화", body: `${fromName}님이 영상통화를 걸었어요` },
            webpush: { headers: { TTL: "90", Urgency: "high" }, notification: { title: "영상통화", body: `${fromName}님이 영상통화를 걸었어요`, icon: "/wag.png", tag: `video-${body.id}`, data: { url } }, fcmOptions: { link: url } },
            android: { priority: "high", ttl: 90000, notification: { title: "영상통화", body: `${fromName}님이 영상통화를 걸었어요` } },
            apns: { headers: { "apns-expiration": String(Math.floor(Date.now() / 1000) + 90) }, payload: { aps: { alert: { title: "영상통화", body: `${fromName}님이 영상통화를 걸었어요` }, sound: "default" } } },
          });
        } catch { /* Polling is the fallback, never fail a created invitation. */ }
      }
      return json({ id: body.id });
    }
    await db.runTransaction(async tx => {
      const c = (await tx.get(ref)).data() as VideoCall | undefined;
      if (!c || !isParticipant(c, uid)) throw new Failure(404, "참여할 수 없는 통화야.");
      if (body.action === "end") {
        const owner = uid === c.fromUid ? c.fromClient : c.toClient;
        if (body.client && owner && body.client !== owner) throw new Failure(409, "다른 창에서 통화 중이야.");
        tx.update(ref, { status: "ended", reason: c.status === "ringing" && uid === c.toUid ? "declined" : "ended", offer: null, answer: null });
        return;
      }
      if (c.status === "ended" || callExpired(c, Date.now())) throw new Failure(409, "이미 끝난 통화야. 다시 걸어 줘.");
      if (!validCallId(body.client)) throw new Failure(400, "통화 창을 다시 열어 줘.");
      if (body.action === "offer") {
        if (uid !== c.fromUid) throw new Failure(403, "발신자만 연결을 시작할 수 있어.");
        if (c.offer && (c.fromClient !== body.client || c.offer.sdp !== body.description?.sdp)) throw new Failure(409, "다른 창에서 이미 통화 중이야.");
        if (!validDescription(body.description, "offer")) throw new Failure(400, "영상 연결 정보를 확인해 줘.");
        tx.update(ref, { offer: { type: "offer", sdp: body.description.sdp }, fromClient: body.client, fromSeen: Date.now() });
      } else if (body.action === "answer") {
        if (uid !== c.toUid || !c.offer) throw new Failure(403, "수신자만 전화를 받을 수 있어.");
        if (c.answer && (c.toClient !== body.client || c.answer.sdp !== body.description?.sdp)) throw new Failure(409, "다른 창에서 이미 통화 중이야.");
        if (!validDescription(body.description, "answer")) throw new Failure(400, "영상 연결 정보를 확인해 줘.");
        tx.update(ref, { answer: { type: "answer", sdp: body.description.sdp }, toClient: body.client, status: "accepted", acceptedAt: Date.now(), toSeen: Date.now() });
      } else throw new Failure(400, "알 수 없는 통화 요청이야.");
    });
    return json({ ok: true });
  } catch (e) { return fail(e); }
}
