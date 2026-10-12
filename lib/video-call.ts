export type VideoCall = {
  id: string; fromUid: string; toUid: string; fromName: string; toName: string;
  status: "ringing" | "accepted" | "ended";
  createdAt: number; fromSeen: number; toSeen: number; acceptedAt?: number;
  offer?: RTCSessionDescriptionInit | null; answer?: RTCSessionDescriptionInit | null;
  reason?: string; fromClient?: string; toClient?: string;
};
export const validCallId = (id: unknown): id is string => typeof id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
export const isParticipant = (call: VideoCall, uid: string) => call.fromUid === uid || call.toUid === uid;
export const callExpired = (call: VideoCall, now: number) => call.status === "ringing"
  ? now - call.createdAt > 90000
  : call.status === "accepted" && (now - Math.min(call.fromSeen, call.toSeen) > 60000 || now - call.createdAt > 7200000);
export const validDescription = (value: unknown, type: "offer" | "answer"): value is RTCSessionDescriptionInit => {
  if (!value || typeof value !== "object") return false;
  const d = value as RTCSessionDescriptionInit;
  return d.type === type && typeof d.sdp === "string" && d.sdp.length < 60000 && d.sdp.startsWith("v=0") && d.sdp.includes("m=audio") && d.sdp.includes("m=video");
};
