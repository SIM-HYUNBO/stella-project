import { NextRequest, NextResponse } from "next/server";
import getAdmin from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { toNicknames, fromNickname, message, roomName, url } = await req.json();

    const targets: string[] = Array.isArray(toNicknames)
      ? toNicknames
      : [toNicknames];

    const admin = getAdmin();
    if (!admin) {
      console.warn("[FCM] Admin SDK not configured.");
      return NextResponse.json({ ok: false, reason: "admin_not_configured" });
    }

    const firestore = admin.firestore();

    const details: any[] = [];

    await Promise.allSettled(
      targets.map(async (nickname) => {
        const snap = await firestore.doc(`fcm_tokens/${nickname}`).get();
        if (!snap.exists) {
          details.push({ nickname, status: "no_token" });
          return;
        }

        const token = snap.data()?.token;
        if (!token) {
          details.push({ nickname, status: "token_empty" });
          return;
        }

        const title = roomName
          ? `[${roomName}] ${fromNickname}`
          : `${fromNickname}님의 메시지`;

        try {
          await admin.messaging().send({
            token,
            data: { title, body: message, url: url || "/home" },
            webpush: {
              headers: { Urgency: "high" },
              notification: {
                title,
                body: message,
                icon: "/wag.png",
                badge: "/wag.png",
                tag: `chat-${Date.now()}`,
                renotify: true,
              },
              fcmOptions: { link: url || "/home" },
            },
            android: {
              priority: "high",
              notification: {
                sound: "alert1",
                priority: "max",
                defaultVibrateTimings: true,
                defaultSound: false,
              },
            },
            apns: {
              payload: { aps: { sound: "default", badge: 1, contentAvailable: true } },
              headers: { "apns-priority": "10" },
            },
          });
          details.push({ nickname, status: "sent" });
        } catch (sendErr: any) {
          details.push({ nickname, status: "send_failed", error: sendErr?.message });
          console.error("[FCM] send error for", nickname, sendErr?.message);
        }
      })
    );

    return NextResponse.json({ ok: true, details });
  } catch (e: any) {
    console.error("FCM 전송 오류:", e);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
