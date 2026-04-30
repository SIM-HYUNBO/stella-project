// app/api/push/route.ts
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { db } from "@/app/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  webpush.setVapidDetails(
    "mailto:your@email.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  try {
    const { toNickname, fromNickname, message } = await req.json();

    // 수신자 구독 정보 가져오기
    const snap = await getDoc(doc(db, "push_subscriptions", toNickname));
    if (!snap.exists()) return NextResponse.json({ ok: false, reason: "no subscription" });

    const subscription = JSON.parse(snap.data().subscription);

    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: `${fromNickname}님의 메시지`,
        body: message,
        url: "/chat",
      })
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("푸시 전송 오류:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}