import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import getAdmin from "@/lib/firebaseAdmin";
import { refreshCall, visibleCall, memberOf, isParticipant, MAX_CALL_MEMBERS, validCallId, validDescription, type VideoCall } from "@/lib/video-call";

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

async function invitePush(admin: ReturnType<typeof getAdmin>, name: string, from: string, id: string) {
  try {
    const people = await admin.firestore().collection("users").where("nickname", "==", name).limit(1).get();
    if (people.docs[0]?.data()?.pushEnabled === false) return;
    const token = (await admin.firestore().collection("fcm_tokens").doc(name).get()).data()?.token;
    const url = `/video-call/${id}`, title = "영상통화", message = `${from}님이 영상통화에 초대했어요`;
    if (token) await admin.messaging().send({ token, data: { url, title, body: message },
      webpush: { headers: { TTL: "90", Urgency: "high" }, notification: { title, body: message, icon: "/wag.png", tag: `video-${id}`, data: { url } }, fcmOptions: { link: url } },
      android: { priority: "high", ttl: 90000, notification: { title, body: message } },
      apns: { headers: { "apns-expiration": String(Math.floor(Date.now() / 1000) + 90) }, payload: { aps: { alert: { title, body: message }, sound: "default" } } },
    });
  } catch { /* The invitation remains available in-app if push fails. */ }
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
      if (!stored || !(isParticipant(stored, uid) || stored.fromUid === uid || stored.toUid === uid)) throw new Failure(404, "참여할 수 없는 통화야.");
      const c = refreshCall(stored, Date.now());
      const me = memberOf(c, uid), client = req.nextUrl.searchParams.get("client");
      if (c.status !== "ended" && me?.state === "joined" && client && me.client === client) me.seenAt = Date.now();
      if (JSON.stringify(c) !== JSON.stringify(stored)) tx.set(ref, c);
      return visibleCall(c, uid);
    });
    let friends: { uid: string; nickname: string }[] | undefined;
    if (req.nextUrl.searchParams.get("friends") === "1" && memberOf(call, uid)?.state === "joined" && call.status !== "ended") {
      const relationships = await db.collection("friends").where("users", "array-contains", uid).get();
      const ids = Array.from(new Set<string>(relationships.docs.flatMap(d => (d.data().users || []).filter((v: string) => v !== uid))));
      const people = await Promise.all(ids.map(friend => db.collection("users").doc(friend).get()));
      friends = people.filter(p => p.exists).map(p => ({ uid: p.id, nickname: p.data()?.nickname || "친구" }));
    }
    return json({ call, uid, ...(friends ? { friends } : {}), ...(requestedId ? iceConfig(uid) : {}) });
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
    if (body.action === "create" || body.action === "invite") {
      if (!validCallId(body.toUid) || body.toUid === uid) throw new Failure(400, "초대할 친구를 선택해 줘.");
      const friends = await db.collection("friends").where("users", "array-contains", uid).get();
      if (!friends.docs.some(d => d.data().users?.includes(body.toUid))) throw new Failure(403, "친구만 초대할 수 있어.");
      const [from, to] = await Promise.all([db.collection("users").doc(uid).get(), db.collection("users").doc(body.toUid).get()]);
      if (!from.exists || !to.exists) throw new Failure(404, "친구 정보를 찾지 못했어.");
      const fromName = from.data()?.nickname || "친구", toName = to.data()?.nickname || "친구";
      const invited = await db.runTransaction(async tx => {
        const existing = (await tx.get(ref)).data() as VideoCall | undefined;
        const c = existing ? refreshCall(existing, Date.now()) : null;
        if (body.action === "create" && c) {
          if (c.fromUid !== uid || c.toUid !== body.toUid) throw new Failure(403, "잘못된 통화 요청이야.");
          return false;
        }
        if (body.action === "invite") {
          const me = c && memberOf(c, uid);
          if (!c || c.status === "ended" || me?.state !== "joined" || me.client !== body.client) throw new Failure(403, "통화에 참여한 뒤 친구를 초대해 줘.");
          const target = memberOf(c, body.toUid);
          if (target) {
            if (target.state === "left") throw new Failure(409, "이 통화를 나간 친구야. 다시 통화를 시작해서 초대해 줘.");
            return false;
          }
          if (c.members.length >= MAX_CALL_MEMBERS) throw new Failure(409, "영상통화는 최대 4명이 함께할 수 있어.");
        }
        const own = db.collection("videoCallUsers").doc(uid), other = db.collection("videoCallUsers").doc(body.toUid);
        const slots = await Promise.all([tx.get(own), tx.get(other)]);
        const reservations = await Promise.all(slots.map(s => s.data()?.callId ? tx.get(db.collection("videoCalls").doc(s.data().callId)) : Promise.resolve(null)));
        if (reservations.some((s, i) => {
          if (!s?.exists || (body.action === "invite" && i === 0)) return false;
          const active = refreshCall(s.data() as VideoCall, Date.now());
          return active.status !== "ended" && memberOf(active, i === 0 ? uid : body.toUid)?.state !== "left";
        })) throw new Failure(409, "이미 다른 통화 중이야. 잠시 후 다시 초대해 줘.");
        if (Date.now() - (slots[0].data()?.lastCalledAt || 0) < 3000) throw new Failure(429, "조금만 기다렸다가 초대해 줘.");
        const now = Date.now();
        const target = { uid: body.toUid, name: toName, state: "invited" as const, invitedBy: fromName, invitedAt: now, seenAt: now };
        if (body.action === "create") tx.set(ref, { id: body.id, fromUid: uid, toUid: body.toUid, fromName, toName, status: "ringing", createdAt: now,
          members: [{ uid, name: fromName, state: "invited", invitedBy: fromName, invitedAt: now, seenAt: now }, target], signals: [], deleteAfter: new Date(now + 86400000) });
        else tx.set(ref, { ...c, members: [...c.members, target] });
        tx.set(own, { callId: body.id, lastCalledAt: now });
        tx.set(other, { callId: body.id }, { merge: true });
        return true;
      });
      if (invited) await invitePush(admin, toName, fromName, body.id);
      return json({ id: body.id });
    }
    await db.runTransaction(async tx => {
      const stored = (await tx.get(ref)).data() as VideoCall | undefined;
      if (!stored || !isParticipant(stored, uid)) throw new Failure(404, "참여할 수 없는 통화야.");
      let c = refreshCall(stored, Date.now());
      const me = memberOf(c, uid)!;
      if (body.action === "end") {
        if (me.client && me.client !== body.client) throw new Failure(409, "다른 창에서 통화 중이야.");
        me.state = "left";
        c = refreshCall(c, Date.now());
        tx.set(ref, c);
        return;
      }
      if (c.status === "ended" || me.state === "left") throw new Failure(409, "이미 끝난 통화야. 다시 걸어 줘.");
      if (!validCallId(body.client)) throw new Failure(400, "통화 창을 다시 열어 줘.");
      if (me.client && me.client !== body.client) throw new Failure(409, "다른 창에서 이미 통화 중이야.");
      if (body.action === "join") {
        me.state = "joined"; me.client = body.client; me.seenAt = Date.now();
        tx.set(ref, refreshCall(c, Date.now()));
        return;
      }
      const peer = validCallId(body.peerUid) ? memberOf(c, body.peerUid) : null;
      if (me.state !== "joined" || !peer || peer.uid === uid || peer.state !== "joined") throw new Failure(403, "수락한 참여자끼리만 연결할 수 있어.");
      const [fromUid, toUid] = [uid, peer.uid].sort();
      let signal = c.signals.find(s => s.fromUid === fromUid && s.toUid === toUid);
      if (body.action === "offer") {
        if (uid !== fromUid) throw new Failure(403, "연결 순서를 확인해 줘.");
        if (!validDescription(body.description, "offer")) throw new Failure(400, "영상 연결 정보를 확인해 줘.");
        if (signal?.offer && signal.offer.sdp !== body.description.sdp) throw new Failure(409, "이미 연결을 준비 중이야.");
        if (!signal) { signal = { fromUid, toUid, offer: null, answer: null }; c.signals.push(signal); }
        signal.offer = { type: "offer", sdp: body.description.sdp };
      } else if (body.action === "answer") {
        if (uid !== toUid || !signal?.offer) throw new Failure(403, "연결 요청을 먼저 기다려 줘.");
        if (!validDescription(body.description, "answer")) throw new Failure(400, "영상 연결 정보를 확인해 줘.");
        if (signal.answer && signal.answer.sdp !== body.description.sdp) throw new Failure(409, "이미 연결을 준비 중이야.");
        signal.answer = { type: "answer", sdp: body.description.sdp };
      } else throw new Failure(400, "알 수 없는 통화 요청이야.");
      tx.set(ref, c);
    });
    return json({ ok: true });
  } catch (e) { return fail(e); }
}
