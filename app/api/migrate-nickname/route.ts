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
    if (typeof from !== "string" || typeof to !== "string" || !to.trim() || to !== to.trim() || to.length > 30 || /[\/\x00-\x1f]/.test(from + to)) return NextResponse.json({ ok: false, error: "닉네임은 1~30자로 입력해 줘. 슬래시는 쓸 수 없어." }, { status: 400 });
    if (from === to || (callerNickname === to && userSnap.data()?.previousNickname === from)) return NextResponse.json({ ok: true, updated: 0 });
    const isAdmin = decoded.admin === true || (process.env.ADMIN_UIDS || "").split(",").includes(uid);
    const isSelfMigration = from === callerNickname;
    if (!isAdmin && !isSelfMigration) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    const owners = await db.collection("users").where("nickname", "==", from).get();
    const owner = owners.docs.find(d => d.id === uid) || (isAdmin ? owners.docs[0] : undefined);
    if (!owner) return NextResponse.json({ ok: false, error: "변경할 프로필을 찾지 못했어." }, { status: 404 });
    const claim = db.collection("nicknameClaims").doc(Buffer.from(to).toString("base64url"));
    const lock = db.collection("nicknameMigrations").doc(owner.id);
    await db.runTransaction(async tx => {
      const [existing, reserved, busy] = await Promise.all([tx.get(db.collection("users").where("nickname", "==", to)), tx.get(claim), tx.get(lock)]);
      if (busy.data()?.to !== to && busy.data()?.until > Date.now()) throw Error("이전 닉네임 변경을 마치는 중이야. 잠시 후 다시 시도해 줘.");
      if (existing.docs.some(d => d.id !== owner.id) || (reserved.exists && reserved.data()?.uid !== owner.id)) throw Error("이미 사용 중인 닉네임이야.");
      tx.set(claim, { uid: owner.id });
      tx.set(lock, { from, to, until: Date.now() + 120000 });
    });

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
        const authored = await roomDoc.ref.collection("messages").where("from", "==", from).get();
        const read = await roomDoc.ref.collection("messages").where("readBy", "array-contains", from).get();
        const msgSnap = { docs: Array.from(new Map([...authored.docs, ...read.docs].map(d => [d.id, d])).values()) };
        for (const msgDoc of msgSnap.docs) {
          const msgData = msgDoc.data();
          const msgUpdates: Record<string, any> = msgData.from === from ? { from: to } : {};
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
      if (!msgData.fromUid) updates.fromUid = owner.id;
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
      if (!msgData2.toUid) updates2.toUid = owner.id;
      if (msgData2.readBy?.includes(from)) updates2.readBy = msgData2.readBy.map((name: string) => name === from ? to : name);
      await msgDoc.ref.update(updates2);
      updated++;
    }

    for (const name of ["draw_requests", "story_requests"]) {
      for (const field of ["from", "to"]) {
        const requests = await db.collection(name).where(field, "==", from).get();
        for (const d of requests.docs) {
          const sessionId = d.data().sessionId;
          if (typeof sessionId === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(sessionId)) {
            const kind = name === "story_requests" ? "story" : "draw";
            const authored = await db.collection(`${kind}_sessions`).doc(sessionId).collection(kind === "story" ? "lines" : "strokes").where("by", "==", from).get();
            for (const item of authored.docs) await item.ref.update({ by: to });
          }
          await d.ref.update({ [field]: to });
        }
      }
    }
    const token = await db.doc(`fcm_tokens/${from}`).get();
    if (token.exists) { await db.doc(`fcm_tokens/${to}`).set(token.data()); await token.ref.delete(); }
    const notices = await db.collection("notifications").doc(from).collection("items").get();
    for (const notice of notices.docs) { await db.collection("notifications").doc(to).collection("items").doc(notice.id).set(notice.data()); await notice.ref.delete(); }
    // Publish the new name only after its dependent data has moved successfully.
    await db.runTransaction(async tx => {
      const oldClaim = db.collection("nicknameClaims").doc(Buffer.from(from).toString("base64url"));
      const old = await tx.get(oldClaim);
      tx.update(owner.ref, { nickname: to, previousNickname: from });
      tx.delete(lock);
      if (old.data()?.uid === owner.id) tx.delete(oldClaim);
    });
    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
