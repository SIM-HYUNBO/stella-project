import { apiUser, apiRateLimit, ApiError } from "@/lib/api-user";
export async function aiGuard(req: Request) {
  try { const { db, uid } = await apiUser(req); await apiRateLimit(db, uid, "ai", 20); return null; }
  catch (e) { return Response.json({ error: e instanceof ApiError ? e.message : "서버에 연결하지 못했어." }, { status: e instanceof ApiError ? e.status : 500 }); }
}
