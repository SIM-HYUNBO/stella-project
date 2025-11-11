import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export const getUserNickname = async (uid: string) => {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().nickname : "익명";
};
