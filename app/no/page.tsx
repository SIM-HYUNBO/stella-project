"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";

const sounds = [
  { id: "1",  name: "와기 알림",    file: "/sounds/alert1.mp3" },
  { id: "2",  name: "딩동",         file: "/sounds/alert2.mp3" },
  { id: "3",  name: "짧은 딩동",    file: "/sounds/alert3.mp3" },
  { id: "4",  name: "부드러운 알림", file: "/sounds/alert4.mp3" },
  { id: "5",  name: "경고음",       file: "/sounds/alert5.mp3" },
  { id: "6",  name: "전자음",       file: "/sounds/alert6.mp3" },
  { id: "7",  name: "벨",           file: "/sounds/alert7.mp3" },
  { id: "8",  name: "물방울",       file: "/sounds/alert8.mp3" },
  { id: "9",  name: "팝업",         file: "/sounds/alert9.mp3" },
  { id: "10", name: "VIP 전용",     file: "/sounds/alert10.mp3" },
];

export default function AlarmSoundPage() {
  const [selected, setSelected] = useState("1");
  const [isVip, setIsVip] = useState(false);
  const [uid, setUid] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => { if (user) setUid(user.uid); });
    return () => unsub();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!uid) return;
      const snap = await getDoc(doc(db, "users", uid));
      setIsVip(snap.data()?.vip === true);
    };
    load();
  }, [uid]);

  useEffect(() => {
    const saved = localStorage.getItem("alarmSound");
    if (saved) setSelected(saved);
  }, []);

  const playSound = (id: string, file: string) => {
    const finalFile = isVip && id === "10" ? "/sounds/alert10.mp3" : file;
    new Audio(finalFile).play();
  };

  const selectSound = (id: string) => {
    setSelected(id);
    localStorage.setItem("alarmSound", id);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-[#FFFBF0]" />
      <div className="relative z-10">
        <div className="flex items-center h-14 px-4 bg-white sticky top-0 z-20">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold text-lg mr-3">←</button>
          <span className="font-black text-stone-800 text-base">🔔 알림 소리 설정</span>
        </div>
        <div className="px-5 pt-6 pb-16 space-y-3">

          {/* VIP 상태 */}
          <div className={`rounded-[20px] px-5 py-3 flex items-center gap-3 border ${isVip ? "bg-yellow-100 border-transparent" : "bg-white/80 border-amber-100"}`}>
            <span className="text-2xl">{isVip ? "💎" : "👤"}</span>
            <p className={`font-black text-sm ${isVip ? "text-white" : "text-stone-800"}`}>{isVip ? "VIP 활성 상태" : "일반 사용자"}</p>
          </div>

          {sounds.map((s) => {
            const isVipOnly = s.id === "10";
            const isSelected = selected === s.id;
            const locked = isVipOnly && !isVip;
            return (
              <div key={s.id} onClick={() => { if (locked) { alert("VIP 전용입니다"); return; } selectSound(s.id); }}
                className={`rounded-[20px] px-5 py-4 flex items-center justify-between cursor-pointer border transition-all active:scale-[0.98]
                  ${isSelected ? "bg-amber-100 border-transparent" : "bg-white/80 border-amber-100"}
                  ${locked ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3">
                  {isSelected ? <span className="text-white text-lg">✓</span> : <span className="text-stone-400 text-lg">🔈</span>}
                  <div>
                    <p className={`font-black text-sm ${isSelected ? "text-white" : "text-stone-800"}`}>{s.name}</p>
                    {isVipOnly && <p className={`text-[10px] font-bold ${isSelected ? "text-white/70" : "text-amber-700"}`}>💎 VIP 전용</p>}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); if (locked) return alert("VIP 전용"); playSound(s.id, s.file); }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-base shadow ${isSelected ? "bg-white/25 text-white" : "bg-amber-50 text-amber-700"}`}>
                  ▶
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
