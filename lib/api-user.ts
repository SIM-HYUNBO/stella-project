import getAdmin from "@/lib/firebaseAdmin";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function apiUser(req: Request, legacyToken?: string) {
  const admin = getAdmin();
  if (!admin) throw new ApiError(503, "서버 연결을 준비하지 못했어. 잠시 후 다시 시도해 줘.");
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1] || legacyToken;
  if (!token) throw new ApiError(401, "로그인이 필요해.");
  let uid: string;
  try { uid = (await admin.auth().verifyIdToken(token)).uid; }
  catch { throw new ApiError(401, "로그인이 만료됐어. 다시 로그인해 줘."); }
  const db = admin.firestore();
  const profile = await db.collection("users").doc(uid).get();
  if (!profile.exists) throw new ApiError(403, "내 프로필을 찾지 못했어.");
  return { admin, db, uid, profile: profile.data()!, nickname: profile.data()!.nickname as string };
}

// Shared Firestore counter: survives cold starts and concurrent server instances.
export async function apiRateLimit(db: ReturnType<ReturnType<typeof getAdmin>["firestore"]>, uid: string, scope: string, maximum: number) {
  const now = Date.now(), bucket = Math.floor(now / 60000);
  const ref = db.collection("apiLimits").doc(`${scope}_${uid}`);
  await db.runTransaction(async tx => {
    const data = (await tx.get(ref)).data();
    const count = data?.bucket === bucket ? data.count : 0;
    if (count >= maximum) throw new ApiError(429, "요청이 너무 빨라. 1분 뒤 다시 시도해 줘.");
    tx.set(ref, { bucket, count: count + 1, deleteAfter: new Date(now + 86400000) });
  });
}
