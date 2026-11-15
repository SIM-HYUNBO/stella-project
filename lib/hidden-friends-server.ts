import type { firestore } from "firebase-admin";

export async function hasHiddenFriend(db: firestore.Firestore, owner: string, target: string, name: string) {
  const snapshot = await db.collection("hidden").where("user_id", "==", owner).get();
  return snapshot.docs.some(doc => {
    const entry = doc.data();
    return entry.target_uid ? entry.target_uid === target : entry.target_name === name;
  });
}
