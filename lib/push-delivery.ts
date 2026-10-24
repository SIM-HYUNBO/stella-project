import type { firestore, messaging } from "firebase-admin";

// Keep browser and native registrations separate so opening one never replaces the other.
export async function sendUserPush(db: firestore.Firestore, sender: messaging.Messaging, nickname: string, payload: Omit<messaging.TokenMessage, "token">) {
  const ref = db.collection("fcm_tokens").doc(nickname);
  const stored = (await ref.get()).data();
  const targets = ["token", "androidToken"].flatMap(field => typeof stored?.[field] === "string" && stored[field] ? [{ field, token: stored[field] as string }] : []);
  const unique = targets.filter((item, index) => targets.findIndex(other => other.token === item.token) === index);
  if (!unique.length) return "no_token";
  const results = await Promise.all(unique.map(async ({ token }) => {
    try {
      await sender.send({ ...payload, token, android: { ...payload.android, notification: { ...payload.android?.notification, channelId: "wagie_messages_v1", sound: "alert1", defaultSound: false, icon: "ic_notification" } } });
      return true;
    } catch (e: any) {
      if (["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(e?.code)) {
        await db.runTransaction(async tx => {
          const current = (await tx.get(ref)).data();
          if (!current) return;
          for (const { field } of targets.filter(target => target.token === token)) {
            if (current[field] === token) delete current[field];
          }
          tx.set(ref, current);
        });
      }
      return false;
    }
  }));
  return results.some(Boolean) ? "sent" : "send_failed";
}
