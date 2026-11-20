import type { Firestore } from "firebase-admin/firestore";
import { ApiError } from "@/lib/api-user";
import { CHAT_KING } from "@/lib/chat-king";
import { canUseAI, resolveMembership } from "@/lib/membership";

export async function getMembership(db: Firestore, uid: string) {
  // Memberships are provisioned server-side or in the Firebase console, never by the upgrade page.
  const [subscription, reward] = await Promise.all([
    db.collection("memberships").doc(uid).get(),
    db.collection("events").doc(CHAT_KING.id).collection("participants").doc(uid).get(),
  ]);
  return resolveMembership(subscription.data(), reward.data(), Date.now());
}

export async function requireAIMembership(db: Firestore, uid: string, study = false) {
  const membership = await getMembership(db, uid);
  if (!canUseAI(membership, study)) throw new ApiError(403, study
    ? "학습용 AI는 프리미엄 멤버십에서 이용할 수 있어."
    : "일반 AI는 라이트 또는 프리미엄 멤버십에서 이용할 수 있어.");
  return membership;
}
