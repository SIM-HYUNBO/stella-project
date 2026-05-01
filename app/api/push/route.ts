import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { db } from "@/app/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  webpush.setVapidDetails(
    "mailto:hbsim0605@gmail.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  try {
    const { toNickname, fromNickname, message } = await req.json();

    const snap = await getDoc(doc(db, "push_subscriptions", toNickname));
    if (!snap.exists()) return NextResponse.json({ ok: false, reason: "no subscription" });

    const subscription = JSON.parse(snap.data().subscription);

    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: `${fromNickname}님의 메시지`,
          body: message,
          url: "/home",
        })
      );
    } catch (pushErr: any) {
      // 구독이 만료되거나 무효화된 경우 Firestore에서 제거
      if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
        await deleteDoc(doc(db, "push_subscriptions", toNickname)).catch(() => {});
        return NextResponse.json({ ok: false, reason: "subscription expired" });
      }
      throw pushErr;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("푸시 전송 오류:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
