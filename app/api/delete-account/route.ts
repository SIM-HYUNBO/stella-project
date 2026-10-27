import { NextRequest, NextResponse } from "next/server";
import getAdmin from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "admin_not_configured" }, { status: 500 });

  try {
    const { idToken } = await req.json();

    // ID 토큰 검증
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const db = admin.firestore();
    const profile = await db.doc(`users/${uid}`).get();
    const nickname = profile.data()?.nickname;
    if (!nickname) return NextResponse.json({ ok: false, error: "내 프로필을 찾지 못했어." }, { status: 404 });

    let cleanupFailed = false;
    const safeDelete = async (fn: () => Promise<any>) => { try { await fn(); } catch { cleanupFailed = true; } };

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
        const snap = await db.collection(col).where("user_id", "==", uid).get();
        await Promise.all(snap.docs.map((d) => d.ref.delete()));
      });
    }

    // group_rooms 멤버에서 제거
    for (const roomCollection of ["group_rooms", "meeting_rooms"]) await safeDelete(async () => {
      const snap = await db.collection(roomCollection).where("members", "array-contains", nickname).get();
      await Promise.all(snap.docs.map((d) => d.ref.update({ members: admin.firestore.FieldValue.arrayRemove(nickname) })));
    });

    // aroom / presence / fcm_tokens
    await safeDelete(() => db.doc(`aroom/${nickname}`).delete());
    await safeDelete(() => db.doc(`presence/${uid}`).delete());
    await safeDelete(() => db.doc(`fcm_tokens/${nickname}`).delete());
    await safeDelete(() => db.doc(`nicknameMigrations/${uid}`).delete());
    await safeDelete(() => db.doc(`appRatings/${uid}`).delete());
    await safeDelete(async () => {
      const claims = await db.collection("nicknameClaims").where("uid", "==", uid).get();
      await Promise.all(claims.docs.map(d => d.ref.delete()));
    });

    if (cleanupFailed) throw Error("일부 계정 정보를 정리하지 못했어. 다시 탈퇴를 눌러 줘.");
    // Do not report success while the authentication account still exists.
    await admin.auth().deleteUser(uid);
    await db.doc(`users/${uid}`).delete();

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("계정 삭제 오류:", e);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
