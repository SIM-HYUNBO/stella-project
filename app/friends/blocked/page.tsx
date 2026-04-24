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
import { watchAuthState } from "../../authService";
import { useRouter } from "next/navigation";

export default function BlockedPage() {
  const router = useRouter();

  /* 🔥 실제 서비스용이면 여기 로그인값 연결 */
const [myUserId, setMyUserId] = useState<string | null>(null);

useEffect(() => {
  watchAuthState((user) => {
    if (user) setMyUserId(user.displayName);
  });
}, []);

  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    if (!myUserId) return;

    const q = query(
      collection(db, "blocked"),
      where("user_id", "==", myUserId)
    );

    return onSnapshot(q, (snap) => {
      const arr: any[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setList(arr);
    });
  }, [myUserId]);

  const remove = async (id: string) => {
    await deleteDoc(doc(db, "blocked", id));
  };

  return (
    <div className="p-4">

      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.back()}>←</button>
        <h1 className="font-bold">차단 친구</h1>
      </div>

      {/* 리스트 */}
      <div className="space-y-2">
        {list.length === 0 && (
          <div className="text-gray-400 text-sm">
            차단된 사용자가 없습니다
          </div>
        )}

        {list.map((v) => (
          <div
            key={v.id}
            className="flex justify-between p-3 bg-white rounded border"
          >
            <span>{v.target_name}</span>

            <button
              onClick={() => remove(v.id)}
              className="text-red-500 text-sm"
            >
              차단 해제
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}