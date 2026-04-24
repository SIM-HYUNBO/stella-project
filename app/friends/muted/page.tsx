"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/app/firebase";
import { useRouter } from "next/navigation";
import { watchAuthState } from "../../authService";

export default function MutedPage() {
  const router = useRouter();

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);

  /* 로그인 */
  useEffect(() => {
    const unsub = watchAuthState((user) => {
      if (user) setMyUserId(user.uid);
    });
    return () => unsub();
  }, []);

  /* muted 목록 */
  useEffect(() => {
    if (!myUserId) return;

    const q = query(
      collection(db, "muted"),
      where("user_id", "==", myUserId)
    );

    return onSnapshot(q, (snap) => {
      const arr: any[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setList(arr);
    });
  }, [myUserId]);

  const remove = async (id: string) => {
    await deleteDoc(doc(db, "muted", id));
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.back()}>←</button>
        <h1 className="font-bold">알림 끈 친구</h1>
      </div>

      <div className="space-y-2">
        {list.map((v) => (
          <div key={v.id} className="flex justify-between p-3 bg-white rounded">
            <span>{v.target_name}</span>
            <button onClick={() => remove(v.id)} className="text-blue-500">
              알림 켜기
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}