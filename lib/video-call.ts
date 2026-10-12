export const MAX_CALL_MEMBERS = 4;
export type CallMember = {
  uid: string; name: string; state: "invited" | "joined" | "left";
  invitedBy: string; invitedAt: number; seenAt: number; client?: string;
};
export type CallSignal = {
  fromUid: string; toUid: string;
  offer: RTCSessionDescriptionInit | null; answer: RTCSessionDescriptionInit | null;
};
export type VideoCall = {
  id: string; fromUid: string; toUid: string; fromName: string; toName: string;
  status: "ringing" | "accepted" | "ended"; createdAt: number; reason?: string;
  members: CallMember[]; signals: CallSignal[];
};
export const validCallId = (id: unknown): id is string => typeof id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
export const isParticipant = (call: VideoCall, uid: string) => !!call.members?.some(m => m.uid === uid);
export const memberOf = (call: VideoCall, uid: string) => call.members.find(m => m.uid === uid);
export const activeMembers = (call: VideoCall) => call.members.filter(m => m.state !== "left");

/** Expire each member independently: leaving a group never hangs up other pairs. */
export function refreshCall(stored: VideoCall, now: number): VideoCall {
  // Pre-group calls are ephemeral; do not resurrect an old incompatible session.
  if (!stored.members) return { ...stored, members: [], signals: [], status: "ended", reason: "updated" };
  const members = stored.members.map(m => ({ ...m, state: (m.state === "invited" && now - m.invitedAt > 90000) || (m.state === "joined" && now - m.seenAt > 60000) ? "left" as const : m.state }));
  const active = members.filter(m => m.state !== "left");
  const ended = stored.status === "ended" || active.length < 2 || now - stored.createdAt > 7200000;
  return { ...stored, members, status: ended ? "ended" : members.filter(m => m.state === "joined").length >= 2 ? "accepted" : "ringing",
    signals: ended ? [] : (stored.signals || []).filter(s => members.some(m => m.uid === s.fromUid && m.state === "joined") && members.some(m => m.uid === s.toUid && m.state === "joined")),
    ...(ended ? { reason: stored.reason || "timeout" } : {}),
  };
}
export function visibleCall(call: VideoCall, uid: string): VideoCall {
  return { ...call, signals: memberOf(call, uid)?.state === "joined" ? call.signals.filter(s => s.fromUid === uid || s.toUid === uid) : [] };
}
export const validDescription = (value: unknown, type: "offer" | "answer"): value is RTCSessionDescriptionInit => {
  if (!value || typeof value !== "object") return false;
  const d = value as RTCSessionDescriptionInit;
  return d.type === type && typeof d.sdp === "string" && d.sdp.length < 60000 && d.sdp.startsWith("v=0") && d.sdp.includes("m=audio") && d.sdp.includes("m=video");
};
