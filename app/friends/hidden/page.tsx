"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/app/firebase";
import { useRouter } from "next/navigation";
import { watchAuthState } from "../../authService";

export default function HiddenPage() {
  const router = useRouter();
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    const unsub = watchAuthState((user) => { if (user) setMyUserId(user.uid); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!myUserId) return;
    const q = query(collection(db, "hidden"), where("user_id", "==", myUserId));
    return onSnapshot(q, (snap) => {
      const arr: any[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      arr.sort((a, b) => (a.target_name ?? "").localeCompare(b.target_name ?? "", "ko"));
      setList(arr);
    });
  }, [myUserId]);

  const remove = async (id: string) => { await deleteDoc(doc(db, "hidden", id)); };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-yellow-50" />
      <div className="relative z-10">
        <div className="flex items-center h-14 px-4 bg-white  sticky top-0 z-20">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-50 text-sky-400 font-bold text-lg mr-3">←</button>
          <span className="font-black text-[gray-800] text-base">🙈 숨긴 친구</span>
        </div>
        <div className="px-5 pt-6 pb-16 space-y-3">
          {list.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">👀</p>
              <p className="text-[sky-500] font-semibold">숨긴 친구가 없어요</p>
            </div>
          ) : list.map((v) => (
            <div key={v.id} className="rounded-[20px] bg-white  px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-xl">🙈</div>
                <p className="font-black text-[gray-800] text-sm">{v.target_name}</p>
              </div>
              <button onClick={() => remove(v.id)} className="px-4 py-2 bg-yellow-50  text-sky-400 rounded-[12px] text-xs font-black">숨김 해제</button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
