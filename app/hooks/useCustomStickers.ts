"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { auth, db } from "@/app/firebase";
import { CustomSticker, isCustomSticker, MAX_STICKERS } from "@/lib/custom-stickers";

const validStickers = (value: unknown): CustomSticker[] => Array.isArray(value) ? value.filter(isCustomSticker) : [];

export default function useCustomStickers() {
  const [uid, setUid] = useState<string | null>(null);
  const [stickers, setStickers] = useState<CustomSticker[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let stop: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, user => {
      stop?.(); setStickers([]); setReady(false); setUid(user?.uid || null);
      if (!user) { setError("로그인하면 이모티콘을 저장할 수 있어."); setReady(true); return; }
      stop = onSnapshot(doc(db, "users", user.uid), snapshot => {
        setStickers(validStickers(snapshot.data()?.customStickers));
        setError(""); setReady(true);
      }, () => { setError("이모티콘을 불러오지 못했어. 다시 들어와 줘."); setReady(true); });
    });
    return () => { stopAuth(); stop?.(); };
  }, []);

  const save = async (sticker: CustomSticker) => {
    if (!uid || !isCustomSticker(sticker)) throw Error("로그인 상태와 그림을 확인해 줘.");
    await runTransaction(db, async transaction => {
      const target = doc(db, "users", uid);
      const snapshot = await transaction.get(target);
      if (!snapshot.exists()) throw Error("내 프로필을 찾지 못했어.");
      const items = validStickers(snapshot.data().customStickers);
      if (items.some(item => item.id === sticker.id)) return;
      if (items.length >= MAX_STICKERS) throw Error(`이모티콘은 ${MAX_STICKERS}개까지 저장할 수 있어. 하나 지운 뒤 다시 저장해 줘.`);
      transaction.update(target, { customStickers: [...items, sticker] });
    });
  };
  const remove = async (id: string) => {
    if (!uid) return;
    await runTransaction(db, async transaction => {
      const target = doc(db, "users", uid);
      const snapshot = await transaction.get(target);
      if (!snapshot.exists()) throw Error("내 프로필을 찾지 못했어.");
      const items = validStickers(snapshot.data().customStickers);
      transaction.update(target, { customStickers: items.filter(item => item.id !== id) });
    });
  };
  return { stickers, ready, error, save, remove };
}
