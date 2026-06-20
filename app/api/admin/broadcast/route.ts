import { NextRequest, NextResponse } from "next/server";
import getAdmin from "@/lib/firebaseAdmin";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:hbsim0605@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ error: "admin not configured" }, { status: 500 });

  try {
    const { idToken, title, message, targetNicknames } = await req.json();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userSnap = await admin.firestore().collection("users").doc(decoded.uid).get();
    if (userSnap.data()?.nickname !== "Stella") {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    let sent = 0;
    let failed = 0;
    const payload = JSON.stringify({ title: title || "📢 공지", body: message, url: "/home" });

    if (targetNicknames && Array.isArray(targetNicknames) && targetNicknames.length > 0) {
      for (const nick of targetNicknames as string[]) {
        const subDoc = await admin.firestore().collection("push_subscriptions").doc(nick).get();
        if (!subDoc.exists()) { failed++; continue; }
        try {
          const subscription = JSON.parse(subDoc.data()!.subscription);
          await webpush.sendNotification(subscription, payload);
          sent++;
        } catch { failed++; }
      }
    } else {
      const subs = await admin.firestore().collection("push_subscriptions").get();
      for (const sub of subs.docs) {
        try {
          const subscription = JSON.parse(sub.data().subscription);
          await webpush.sendNotification(subscription, payload);
          sent++;
        } catch { failed++; }
      }
    }

    await admin.firestore().collection("announcements").add({
      title: title || "공지",
      message,
      sentTo: sent,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, sent, failed });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
