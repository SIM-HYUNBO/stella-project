import { NextRequest, NextResponse } from "next/server";
import { ApiError, apiRateLimit, apiUser } from "@/lib/api-user";
import { enterSpyRoom, spyView, type SpyRoom } from "@/lib/spy-room";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const fail = (error: unknown) => json({ error: error instanceof ApiError ? error.message : "스파이방에 연결하지 못했어. 다시 시도해 줘." }, error instanceof ApiError ? error.status : 500);
const validId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value);

async function friendIds(db: Awaited<ReturnType<typeof apiUser>>["db"], uid: string) {
  const friends = await db.collection("friends").where("users", "array-contains", uid).get();
  return Array.from(new Set<string>(friends.docs.flatMap(d => (d.data().users || []).filter((id: string) => id !== uid))));
}

export async function GET(req: NextRequest) {
  try {
    const { db, uid } = await apiUser(req);
    const [rooms, ids] = await Promise.all([
      db.collection("spyRooms").where("memberIds", "array-contains", uid).get(),
      friendIds(db, uid),
    ]);
    const friends = ids.length ? await db.getAll(...ids.map(id => db.collection("users").doc(id))) : [];
    return json({ uid, friends: friends.filter(d => d.exists).map(d => ({ uid: d.id, name: d.data()?.nickname || "친구" })),
      rooms: rooms.docs.map(d => {
        const r = d.data() as SpyRoom;
        return { id: d.id, name: r.name, count: r.members.length, startedAt: r.startedAt, createdAt: r.createdAt };
      }).sort((a, b) => b.createdAt - a.createdAt) });
  } catch (error) { return fail(error); }
}

export async function POST(req: NextRequest) {
  try {
    const { db, uid, nickname } = await apiUser(req);
    const secret = process.env.SPY_ROOM_SECRET || process.env.FIREBASE_PRIVATE_KEY || process.env.FCM_SERVICE_ACCOUNT_KEY;
    if (!secret) throw new ApiError(503, "스파이방을 준비하지 못했어.");
    const raw = await req.text();
    if (raw.length > 5000) throw new ApiError(400, "요청이 너무 커.");
    let body;
    try { body = JSON.parse(raw); } catch { throw new ApiError(400, "요청을 확인해 줘."); }
    if (body?.action === "create") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 32 || !Array.isArray(body.invited) || body.invited.length > 9 || !body.invited.every(validId)) throw new ApiError(400, "방 이름과 초대할 친구를 확인해 줘.");
      const invited = Array.from(new Set<string>(body.invited));
      if (!invited.length) throw new ApiError(400, "친구를 1명 이상 골라 줘.");
      await apiRateLimit(db, uid, "spy-create", 5);
      const allowed = await friendIds(db, uid);
      if (invited.some(id => !allowed.includes(id))) throw new ApiError(403, "친구만 초대할 수 있어.");
      const profiles = await db.getAll(...invited.map(id => db.collection("users").doc(id)));
      if (profiles.some(d => !d.exists)) throw new ApiError(404, "초대할 친구를 찾지 못했어.");
      const room: SpyRoom = {
        name, memberIds: [uid, ...invited], members: [{ uid, name: nickname || "나" }, ...profiles.map(d => ({ uid: d.id, name: d.data()?.nickname || "친구" }))],
        createdAt: Date.now(), startedAt: null, presence: {}, messages: [],
      };
      const ref = await db.collection("spyRooms").add(room);
      return json({ id: ref.id });
    }
    if (!validId(body?.id) || !validId(body.session) || !["enter", "leave", "send"].includes(body.action)) throw new ApiError(400, "스파이방 요청을 확인해 줘.");
    const message = typeof body.text === "string" ? body.text.trim() : "";
    if (body.action === "send") {
      if (!message || message.length > 500 || !validId(body.messageId)) throw new ApiError(400, "메시지는 1~500자로 써 줘.");
      await apiRateLimit(db, uid, "spy-send", 45);
    }
    const ref = db.collection("spyRooms").doc(body.id);
    return json(await db.runTransaction(async tx => {
      let room = (await tx.get(ref)).data() as SpyRoom | undefined;
      if (!room?.memberIds.includes(uid)) throw new ApiError(404, "초대받은 사람만 들어갈 수 있어.");
      const now = Date.now();
      if (body.action === "leave") {
        if (room.presence[uid]?.session === body.session) {
          delete room.presence[uid];
          tx.update(ref, { presence: room.presence });
        }
        return { ok: true };
      }
      if (body.action === "enter" && (room.presence[uid]?.session !== body.session || room.presence[uid].at <= now - 4000)) {
        room = enterSpyRoom(room, uid, body.session, now);
        tx.update(ref, { presence: room.presence, startedAt: room.startedAt });
      }
      if (body.action === "send") {
        if (room.startedAt === null) throw new ApiError(409, "모두 들어오면 채팅이 열려.");
        const id = `${uid}:${body.messageId}`;
        if (!room.messages.some(m => m.id === id)) {
          room.messages = [...room.messages, { id, uid, text: message, at: now }].slice(-100);
          tx.update(ref, { messages: room.messages });
        }
      }
      return spyView(room, ref.id, uid, now, secret);
    }));
  } catch (error) { return fail(error); }
}
