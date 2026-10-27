import { NextRequest, NextResponse } from "next/server";
import { apiUser, apiRateLimit, ApiError } from "@/lib/api-user";

const failure = (error: unknown) => NextResponse.json({ error: error instanceof ApiError ? error.message : "평가를 불러오거나 저장하지 못했어요. 다시 시도해 주세요." }, { status: error instanceof ApiError ? error.status : 500 });

export async function GET(req: NextRequest) {
  try {
    const { db, uid } = await apiUser(req);
    const rating = (await db.collection("appRatings").doc(uid).get()).data()?.rating;
    return NextResponse.json({ rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}

export async function PUT(req: NextRequest) {
  try {
    const { db, uid, admin } = await apiUser(req);
    const body = await req.text();
    if (body.length > 100) throw new ApiError(400, "별점을 1~5개 중에서 골라 주세요.");
    let rating: unknown;
    try { rating = JSON.parse(body)?.rating; } catch { throw new ApiError(400, "별점을 확인해 주세요."); }
    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) throw new ApiError(400, "별점을 1~5개 중에서 골라 주세요.");
    await apiRateLimit(db, uid, "app-rating", 10);
    await db.collection("appRatings").doc(uid).set({ rating, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return NextResponse.json({ rating });
  } catch (error) { return failure(error); }
}
