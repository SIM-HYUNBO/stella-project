import { NextResponse } from "next/server";
import { apiUser, ApiError } from "@/lib/api-user";
import { getMembership } from "@/lib/membership-server";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { db, uid } = await apiUser(req);
    return NextResponse.json(await getMembership(db, uid), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ApiError ? error.message : "멤버십을 확인하지 못했어. 다시 시도해 줘." }, { status: error instanceof ApiError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
  }
}
