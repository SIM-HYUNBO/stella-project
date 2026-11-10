import { createHmac } from "node:crypto";

export const SPY_PRESENCE_MS = 15000;
export const SPY_MISSIONS = [
  "아무도 눈치채지 못하게 대화에 ‘감자’를 세 번 넣어 봐.",
  "친구 두 명이 각각 다른 동물 이름을 말하게 해 봐.",
  "친구 한 명이 먼저 ‘왜?’라고 물어보게 해 봐.",
  "아무도 의심하지 않게 대화 주제를 간식으로 바꿔 봐.",
  "친구가 네 메시지에 웃음 이모지를 보내게 해 봐.",
];
export type SpyMember = { uid: string; name: string };
export type SpyMessage = { id: string; uid: string; text: string; at: number };
export type SpyRoom = {
  name: string; members: SpyMember[]; memberIds: string[]; createdAt: number;
  startedAt: number | null; presence: Record<string, { session: string; at: number }>;
  messages: SpyMessage[];
};

export function presentMembers(room: SpyRoom, now: number) {
  return room.members.filter(({ uid }) => room.presence[uid]?.at > now - SPY_PRESENCE_MS);
}

export function enterSpyRoom(room: SpyRoom, uid: string, session: string, now: number) {
  const next = { ...room, presence: { ...room.presence, [uid]: { session, at: now } } };
  if (next.startedAt === null && presentMembers(next, now).length === next.members.length) next.startedAt = now;
  return next;
}

export function spyView(room: SpyRoom, id: string, uid: string, now: number, secret: string) {
  const publicRoom = { id, name: room.name, startedAt: room.startedAt, members: room.members, online: presentMembers(room, now).map(m => m.uid) };
  if (room.startedAt === null) return { ...publicRoom, messages: room.messages, role: null, mission: null };
  // Derive the assignment on the server so no secret role is stored in the room.
  const digest = createHmac("sha256", secret).update(`wagie-spy:v1:${id}:${room.startedAt}`).digest();
  const isSpy = room.members[digest.readUInt32BE(0) % room.members.length].uid === uid;
  return { ...publicRoom, messages: room.messages, role: isSpy ? "spy" : "member", mission: isSpy ? SPY_MISSIONS[digest.readUInt32BE(4) % SPY_MISSIONS.length] : null };
}
