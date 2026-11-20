import { addDoc as firestoreAddDoc, type CollectionReference, type DocumentData, type WithFieldValue } from "firebase/firestore";
import { auth } from "@/app/firebase";
import { apiFetch } from "@/lib/api-fetch";
import { CHAT_KING, chatKingMessagePath } from "@/lib/chat-king";

const running = new Set<string>();
const memoryQueues = new Map<string, Set<string>>();
const queueKey = (uid: string) => `${CHAT_KING.id}:pending:${uid}:`;
function pending(uid: string): string[] {
  const paths = new Set(memoryQueues.get(uid));
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(queueKey(uid))) continue;
      const path = localStorage.getItem(key);
      if (chatKingMessagePath(path)) paths.add(path);
    }
  } catch { /* The in-memory queue remains available. */ }
  return Array.from(paths);
}
function enqueue(uid: string, path: string) {
  const paths = memoryQueues.get(uid) || new Set<string>();
  paths.add(path);
  memoryQueues.set(uid, paths);
  try { localStorage.setItem(queueKey(uid) + encodeURIComponent(path), path); }
  catch { /* Keep an in-memory queue when browser storage is unavailable. */ }
}
function acknowledge(uid: string, path: string) {
  memoryQueues.get(uid)?.delete(path);
  try { localStorage.removeItem(queueKey(uid) + encodeURIComponent(path)); }
  catch { /* Server receipts also prevent duplicates on the next retry. */ }
}

export async function flushChatKingMessages() {
  const uid = auth.currentUser?.uid;
  if (!uid || running.has(uid)) return;
  running.add(uid);
  try {
    while (pending(uid).length > 0) {
      const path = pending(uid)[0];
      if (auth.currentUser?.uid !== uid) break;
      const response = await apiFetch("/api/events/chat-king", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }),
      });
      if (response.status >= 500 || response.status === 429 || response.status === 401) break;
      if (!response.ok && ![400, 403, 404].includes(response.status)) break;
      acknowledge(uid, path);
    }
  } catch { /* Saved receipts are retried when sending again or opening the event. */ }
  finally { running.delete(uid); }
}

// Preserve the existing Firestore write path, then submit its ID for server verification.
export async function addChatDocument<T extends DocumentData>(reference: CollectionReference<T>, data: WithFieldValue<T>) {
  const uid = auth.currentUser?.uid;
  const isMessage = /^(messages|(group_rooms|meeting_rooms)\/[^/]+\/messages)$/.test(reference.path);
  const message = await firestoreAddDoc(reference, { ...data, ...(uid && isMessage ? { fromUid: uid } : {}) });
  if (uid && chatKingMessagePath(message.path) && !["system", "urgent"].includes(data.type as string)) {
    enqueue(uid, message.path);
  }
  void flushChatKingMessages();
  return message;
}
