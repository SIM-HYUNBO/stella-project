import { NextRequest, NextResponse } from "next/server";
import getAdmin from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "admin_not_configured" }, { status: 500 });

  try {
    const { idToken, nickname } = await req.json();

    // ID 토큰 검증
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const db = admin.firestore();

    const safeDelete = async (fn: () => Promise<any>) => { try { await fn(); } catch {} };

    // friends
    await safeDelete(async () => {
      const snap = await db.collection("friends").where("users", "array-contains", uid).get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    });

    // friend_requests
    await safeDelete(async () => {
      const a = await db.collection("friend_requests").where("from", "==", uid).get();
      const b = await db.collection("friend_requests").where("to", "==", uid).get();
      await Promise.all([...a.docs, ...b.docs].map((d) => d.ref.delete()));
    });

    // blocked / hidden / muted
    for (const col of ["blocked", "hidden", "muted"]) {
      await safeDelete(async () => {
        const snap = await db.collection(col).where("user_id", "==", nickname).get();
        await Promise.all(snap.docs.map((d) => d.ref.delete()));
      });
    }

    // group_rooms 멤버에서 제거
    await safeDelete(async () => {
      const snap = await db.collection("group_rooms").where("members", "array-contains", nickname).get();
      await Promise.all(snap.docs.map((d) => d.ref.update({ members: admin.firestore.FieldValue.arrayRemove(nickname) })));
    });

    // aroom / presence / fcm_tokens
    await safeDelete(() => db.doc(`aroom/${nickname}`).delete());
    await safeDelete(() => db.doc(`presence/${uid}`).delete());
    await safeDelete(() => db.doc(`fcm_tokens/${nickname}`).delete());

    // ★ users 문서 삭제
    await db.doc(`users/${uid}`).delete();

    // ★ Firebase Auth 삭제 (이미 삭제된 경우 무시)
    await safeDelete(() => admin.auth().deleteUser(uid));

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("계정 삭제 오류:", e);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
