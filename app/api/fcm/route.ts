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
                sound: "default",
                priority: "max",
                defaultVibrateTimings: true,
                defaultSound: true,
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

    // AI 자동 답장 (1:1 메시지만)
    if (!roomName && targets.length === 1 && process.env.OPENAI_API_KEY) {
      const recipientNickname = targets[0];
      try {
        const recipientSnap = await firestore.collection("users")
          .where("nickname", "==", recipientNickname).limit(1).get();

        if (!recipientSnap.empty) {
          const recipientDoc = recipientSnap.docs[0];
          const recipientUid = recipientDoc.id;

          if (recipientDoc.data().autoReply) {
            const senderSnap = await firestore.collection("users")
              .where("nickname", "==", fromNickname).limit(1).get();

            if (!senderSnap.empty) {
              const senderUid = senderSnap.docs[0].id;

              const recentSnap = await firestore.collection("messages")
                .where("from", "==", recipientNickname).limit(10).get();

              const recentMsgs = recentSnap.docs
                .map((d: any) => d.data().content)
                .filter(Boolean)
                .join("\n");

              const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                  model: "gpt-4o-mini",
                  messages: [
                    {
                      role: "system",
                      content: `너는 ${recipientNickname}야. 아래는 네가 최근에 보낸 메시지들이야. 이 말투와 스타일을 따라서 ${fromNickname}의 메시지에 짧고 자연스럽게 한국어로 대답해. 2문장 이내로.\n\n최근 메시지:\n${recentMsgs || "없음"}`,
                    },
                    { role: "user", content: message },
                  ],
                  max_tokens: 100,
                }),
              });

              if (aiRes.ok) {
                const aiData = await aiRes.json();
                const reply = aiData.choices?.[0]?.message?.content?.trim();
                if (reply) {
                  await firestore.collection("messages").add({
                    from: recipientNickname,
                    to: fromNickname,
                    fromUid: recipientUid,
                    toUid: senderUid,
                    content: reply,
                    type: "text",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    readBy: [recipientNickname],
                  });
                }
              }
            }
          }
        }
      } catch (aiErr: any) {
        console.error("[AutoReply] 오류:", aiErr?.message);
      }
    }

    return NextResponse.json({ ok: true, details });
  } catch (e: any) {
    console.error("FCM 전송 오류:", e);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
