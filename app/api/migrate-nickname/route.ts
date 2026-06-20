import { NextRequest, NextResponse } from "next/server";
import getAdmin from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "admin_not_configured" }, { status: 500 });

  try {
    const { idToken, from, to } = await req.json();

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const db = admin.firestore();

    const userSnap = await db.collection("users").doc(uid).get();
    const callerNickname = userSnap.data()?.nickname;

    // Stella/관리자는 아무 닉네임이나 교체 가능, 일반 유저는 자기 현재 닉네임만 교체 가능
    const isAdmin = callerNickname === "Stella" || callerNickname === "관리자";
    const isSelfMigration = from === callerNickname;
    if (!isAdmin && !isSelfMigration) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }

    let updated = 0;

    const groupSnap = await db.collection("group_rooms").get();
    for (const docSnap of groupSnap.docs) {
      const members: string[] = docSnap.data().members || [];
      if (members.includes(from)) {
        const newMembers = members.map((m) => (m === from ? to : m));
        await docSnap.ref.update({ members: newMembers });
        updated++;
      }
    }

    const meetingSnap = await db.collection("meeting_rooms").get();
    for (const docSnap of meetingSnap.docs) {
      const members: string[] = docSnap.data().members || [];
      if (members.includes(from)) {
        const newMembers = members.map((m) => (m === from ? to : m));
        await docSnap.ref.update({ members: newMembers });
        updated++;
      }
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
