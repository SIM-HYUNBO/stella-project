import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { apiUser, ApiError } from "@/lib/api-user";
import { profileWeek } from "@/lib/profile-activity";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { db, uid, profile, admin } = await apiUser(req);
    const days = await Promise.all(profileWeek().map(async day => {
      const count = await db.collectionGroup("messages").where("fromUid", "==", uid).where("createdAt", ">=", Timestamp.fromMillis(day.start)).where("createdAt", "<", Timestamp.fromMillis(day.end)).count().get();
      return { date: day.date, count: count.data().count };
    }));
    const created = profile.createdAt?.toMillis?.();
    const joinedAt = Number.isFinite(created) ? created : Date.parse((await admin.auth().getUser(uid)).metadata.creationTime);
    return NextResponse.json({ days, joinedAt: Number.isFinite(joinedAt) ? joinedAt : null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    const message = error instanceof ApiError ? error.message : Number(error?.code) === 8 ? "데이터베이스 한도로 채팅량을 불러오지 못했어. 잠시 후 다시 확인해 줘." : Number(error?.code) === 9 ? "채팅 그래프를 준비하고 있어. 잠시 후 다시 확인해 줘." : "채팅량을 불러오지 못했어. 다시 확인해 줘.";
    return NextResponse.json({ error: message }, { status: error instanceof ApiError ? error.status : 503, headers: { "Cache-Control": "no-store" } });
  }
}
