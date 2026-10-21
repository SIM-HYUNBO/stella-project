import { and, or, where } from "firebase/firestore";

export function dmConstraint(uid: string, nickname: string, peerUid: string, peerName: string) {
  const directions = [
    [["fromUid", uid], ["from", nickname], ["toUid", peerUid], ["to", peerName]],
    [["fromUid", peerUid], ["from", peerName], ["toUid", uid], ["to", nickname]],
  ];
  return or(...directions.flatMap(([senderId, senderName, receiverId, receiverName]) =>
    [senderId, senderName].flatMap(sender => [receiverId, receiverName].map(receiver =>
      and(where(sender[0], "==", sender[1]), where(receiver[0], "==", receiver[1]))))));
}

export function messageTimestamp(value: any, pendingTime: number) {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value === "number") return value;
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  if (value) { const time = new Date(value).getTime(); if (Number.isFinite(time)) return time; }
  return pendingTime;
}
