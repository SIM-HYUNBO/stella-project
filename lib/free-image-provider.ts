import { ApiError } from "@/lib/api-user";

// Only a verified free account may run inference. No paid-provider fallback.
export function freeImageConfig() {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !/^[a-f0-9]{32}$/i.test(account) || !token) throw new ApiError(503, "무료 이미지 생성 서비스를 아직 연결하지 않았어.");
  return { account, token };
}

export async function verifyFreeImageAccount(config: ReturnType<typeof freeImageConfig>) {
  let response: Response;
  try {
    response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${config.account}/subscriptions`, {
      headers: { Authorization: `Bearer ${config.token}` }, signal: AbortSignal.timeout(10000), cache: "no-store",
    });
  } catch { throw new ApiError(503, "무료 플랜을 확인하지 못했어. 잠시 후 다시 시도해 줘."); }
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success !== true || !Array.isArray(data.result) || (data.result_info?.total_count ?? data.result.length) > data.result.length) {
    throw new ApiError(503, "무료 플랜 확인 권한이 필요해. Cloudflare 토큰의 Billing 읽기 권한을 확인해 줘.");
  }
  const active = data.result.filter((s: { state?: string }) => !["Cancelled", "Expired", "Failed"].includes(s.state || ""));
  // Unknown subscriptions fail closed, including zero-base-price paid plans.
  if (active.some((s: { price?: number; rate_plan?: { id?: string } }) => s.price !== 0 || !["free", "partners_free"].includes(s.rate_plan?.id || ""))) {
    throw new ApiError(503, "무료 계정인지 확인할 수 없어 이미지 생성을 중단했어. 별도 Cloudflare 무료 계정을 연결해 줘.");
  }
}

export function requestFreeImage(config: ReturnType<typeof freeImageConfig>, prompt: string) {
  return fetch(`https://api.cloudflare.com/client/v4/accounts/${config.account}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.token}` },
    signal: AbortSignal.timeout(100000), body: JSON.stringify({ prompt, steps: 4 }),
  });
}
