import { auth } from "@/app/firebase";
import type { VideoCall } from "@/lib/video-call";

export type CallResponse = { call?: VideoCall | null; uid?: string; id?: string; iceServers?: RTCIceServer[]; relayConfigured?: boolean };
export async function callRequest(query = "", body?: Record<string, unknown>, keepalive = false): Promise<CallResponse> {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요해.");
  const token = await user.getIdToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`/api/video-call${query}`, {
      method: body ? "POST" : "GET", cache: "no-store", keepalive,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined, signal: controller.signal,
    });
    const data = await res.json();
    if (auth.currentUser?.uid !== user.uid) throw new Error("로그인 계정이 변경됐어.");
    if (!res.ok) throw new Error(data.error || "통화 요청을 처리하지 못했어.");
    return data;
  } finally { clearTimeout(timeout); }
}

/** Exchange a complete SDP instead of dropping late trickle candidates. */
export function waitForIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      pc.removeEventListener("icegatheringstatechange", changed);
      pc.removeEventListener("connectionstatechange", closed);
      error ? reject(error) : resolve();
    };
    const changed = () => { if (pc.iceGatheringState === "complete") finish(); };
    const closed = () => { if (pc.connectionState === "closed") finish(new Error("통화가 종료됐어.")); };
    const timeout = setTimeout(() => finish(new Error("네트워크 연결 준비가 오래 걸려. 다른 와이파이나 데이터로 다시 시도해 줘.")), 12000);
    pc.addEventListener("icegatheringstatechange", changed);
    pc.addEventListener("connectionstatechange", closed);
    changed();
  });
}
export function mediaError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") return "카메라와 마이크 권한을 허용한 뒤 다시 걸어 줘.";
    if (error.name === "NotFoundError") return "카메라나 마이크를 찾지 못했어.";
    if (error.name === "NotReadableError") return "다른 앱이 카메라나 마이크를 쓰고 있어. 종료하고 다시 걸어 줘.";
  }
  return error instanceof Error ? error.message : "영상통화를 연결하지 못했어.";
}
