import { NextRequest, NextResponse } from "next/server";
import getAdmin from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { toNicknames, fromNickname, message, roomName } = await req.json();

    const targets: string[] = Array.isArray(toNicknames)
      ? toNicknames
      : [toNicknames];

    const admin = getAdmin();
    if (!admin) {
      console.warn("[FCM] Admin SDK not configured. Add FCM_SERVICE_ACCOUNT_KEY to env.");
      return NextResponse.json({ ok: false, reason: "FCM not configured" });
    }

    const firestore = admin.firestore();

    const results = await Promise.allSettled(
      targets.map(async (nickname) => {
        const snap = await firestore.doc(`fcm_tokens/${nickname}`).get();
        if (!snap.exists) return;

        const token = snap.data()?.token;
        if (!token) return;

        const title = roomName
          ? `[${roomName}] ${fromNickname}`
          : `${fromNickname}님의 메시지`;

        await admin.messaging().send({
          token,
          notification: { title, body: message },
          webpush: {
            fcmOptions: { link: "/home" },
            notification: {
              icon: "/favicon.png",
              badge: "/favicon.png",
              vibrate: [200, 100, 200, 100, 200],
              tag: `chat-${nickname}`,
              renotify: true,
            },
          },
          android: {
            notification: {
              sound: "default",
              priority: "high",
            },
          },
        });
      })
    );

    return NextResponse.json({ ok: true, results: results.length });
  } catch (e) {
    console.error("FCM 전송 오류:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
