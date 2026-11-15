import { NextResponse } from "next/server";
import getAdmin from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ error: "회원가입 서버에 연결하지 못했어." }, { status: 503 });
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const user = token ? await admin.auth().verifyIdToken(token).catch(() => null) : null;
  if (!user?.email) return NextResponse.json({ error: "다시 로그인해 줘." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";
  if (nickname.length < 2 || nickname.length > 30 || /[\/\x00-\x1f]/.test(nickname) ||
    typeof body?.phone !== "string" || !/^\d{10,15}$/.test(body.phone) ||
    typeof body?.birthdate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.birthdate)) return NextResponse.json({ error: "가입 정보를 확인해 줘." }, { status: 400 });
  const db = admin.firestore();
  const profile = db.collection("users").doc(user.uid);
  const claim = db.collection("nicknameClaims").doc(Buffer.from(nickname).toString("base64url"));
  try {
    const result = await db.runTransaction(async tx => {
      if ((await tx.get(profile)).exists) return true;
      const [existing, reserved] = await Promise.all([tx.get(db.collection("users").where("nickname", "==", nickname).limit(1)), tx.get(claim)]);
      if (!existing.empty || (reserved.exists && reserved.data()?.uid !== user.uid)) return false;
      tx.set(claim, { uid: user.uid });
      tx.set(profile, { email: user.email, nickname, phone: body.phone, birthdate: body.birthdate, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return true;
    });
    return result ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "이미 사용 중인 닉네임이야." }, { status: 409 });
  } catch { return NextResponse.json({ error: "가입 정보를 저장하지 못했어. 다시 시도해 줘." }, { status: 500 }); }
}
