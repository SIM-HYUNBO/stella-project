import { NextResponse } from "next/server";
import { apiUser, ApiError } from "@/lib/api-user";
import { getMembership } from "@/lib/membership-server";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { db, uid } = await apiUser(req);
    return NextResponse.json(await getMembership(db, uid), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!(error instanceof ApiError)) {
      const code = error && typeof error === "object" && "code" in error ? error.code : "unknown";
      console.error("Membership lookup failed", { code });
      if ([4, 8, 10, 13, 14].includes(Number(code))) return NextResponse.json({ error: "멤버십 서버 연결이 잠시 불안정해. 잠시 후 다시 시도해 줘." }, { status: 503, headers: { "Cache-Control": "no-store" } });
      if (Number(code) === 7) return NextResponse.json({ error: "멤버십 서버 권한 설정을 확인해야 해. 계정의 멤버십이 없어서 생긴 오류는 아니야." }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: error instanceof ApiError ? error.message : "멤버십을 확인하지 못했어. 다시 시도해 줘." }, { status: error instanceof ApiError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
  }
}
