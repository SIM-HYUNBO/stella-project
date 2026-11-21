import type { Membership } from "./membership";
export class MembershipCheckError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function loadAIMembership(
  request: () => Promise<Response>,
  refreshToken: () => Promise<unknown>,
  wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
): Promise<Membership> {
  let refreshed = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;
    try { response = await request(); }
    catch {
      if (attempt < 2) { await wait(500 * (attempt + 1)); continue; }
      throw new Error("멤버십 서버에 연결하지 못했어. 인터넷 연결을 확인하고 다시 시도해 줘.");
    }
    if (response.status === 401 && !refreshed && attempt < 2) {
      refreshed = true; await refreshToken(); continue;
    }
    const data = await response.json().catch(() => null);
    if (response.ok) {
      if (!data || !["free", "light", "premium"].includes(data.plan) || !(data.expiresAt === null || typeof data.expiresAt === "number" && Number.isFinite(data.expiresAt))) throw new Error("멤버십 응답을 읽지 못했어. 다시 시도해 줘.");
      return data;
    }
    if (data?.retryable !== false && [502, 503, 504, 500].includes(response.status) && attempt < 2) { await wait(500 * (attempt + 1)); continue; }
    throw new MembershipCheckError(data?.error || `멤버십 연결에 문제가 있어. 다시 시도해 줘. (${response.status})`, response.status);
  }
  throw new Error("멤버십을 확인하지 못했어. 다시 시도해 줘.");
}
