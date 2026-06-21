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

    const isAdmin = callerNickname === "Stella" || callerNickname === "관리자";
    const isSelfMigration = from === callerNickname;
    if (!isAdmin && !isSelfMigration) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }

    let updated = 0;

    for (const colName of ["group_rooms", "meeting_rooms"]) {
      const roomSnap = await db.collection(colName).get();
      for (const roomDoc of roomSnap.docs) {
        const data = roomDoc.data();
        const updates: Record<string, any> = {};

        // members 배열
        const members: string[] = data.members || [];
        if (members.includes(from)) {
          updates.members = members.map((m) => (m === from ? to : m));
        }

        // createdBy
        if (data.createdBy === from) {
          updates.createdBy = to;
        }

        if (Object.keys(updates).length > 0) {
          await roomDoc.ref.update(updates);
          updated++;
        }

        // 메시지 subcollection의 from, readBy
        const msgSnap = await roomDoc.ref.collection("messages").where("from", "==", from).get();
        for (const msgDoc of msgSnap.docs) {
          const msgData = msgDoc.data();
          const msgUpdates: Record<string, any> = { from: to };
          const readBy: string[] = msgData.readBy || [];
          if (readBy.includes(from)) {
            msgUpdates.readBy = readBy.map((r) => (r === from ? to : r));
          }
          await msgDoc.ref.update(msgUpdates);
        }
      }
    }

    // 1:1 messages: from/to 텍스트 업데이트 + UID 필드 추가
    const fromMsgs = await db.collection("messages").where("from", "==", from).get();
    for (const msgDoc of fromMsgs.docs) {
      const msgData = msgDoc.data();
      const updates: Record<string, any> = { from: to };
      if (!msgData.fromUid) updates.fromUid = uid;
      const readBy: string[] = msgData.readBy || [];
      if (readBy.includes(from)) {
        updates.readBy = readBy.map((r) => (r === from ? to : r));
      }
      await msgDoc.ref.update(updates);
      updated++;
    }

    const toMsgs = await db.collection("messages").where("to", "==", from).get();
    for (const msgDoc of toMsgs.docs) {
      const msgData2 = msgDoc.data();
      const updates2: Record<string, any> = { to: to };
      if (!msgData2.toUid) updates2.toUid = uid;
      await msgDoc.ref.update(updates2);
      updated++;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
