"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";

const sounds = [
  { id: "1", name: "와기 알림", file: "/sounds/alert1.mp3" },
  { id: "2", name: "딩동", file: "/sounds/alert2.mp3" },
  { id: "3", name: "짧은 딩동", file: "/sounds/alert3.mp3" },
  { id: "4", name: "부드러운 알림", file: "/sounds/alert4.mp3" },
  { id: "5", name: "경고음", file: "/sounds/alert5.mp3" },
  { id: "6", name: "전자음", file: "/sounds/alert6.mp3" },
  { id: "7", name: "벨", file: "/sounds/alert7.mp3" },
  { id: "8", name: "물방울", file: "/sounds/alert8.mp3" },
  { id: "9", name: "팝업", file: "/sounds/alert9.mp3" },
  { id: "10", name: "VIP 전용", file: "/sounds/alert10.mp3" },
];

export default function AlarmSoundPage() {
  const [selected, setSelected] = useState("1");
  const [isVip, setIsVip] = useState(false);
  const [uid, setUid] = useState("");
  const router = useRouter();

  /* 🔥 로그인 */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
    });
    return () => unsub();
  }, []);

  /* 🔥 VIP Firestore */
  useEffect(() => {
    const loadVip = async () => {
      if (!uid) return;
      const snap = await getDoc(doc(db, "users", uid));
      // 수정 ✅
setIsVip(snap.data()?.vip === true);
    };
    loadVip();
  }, [uid]);

  /* 기존 유지 */
  useEffect(() => {
    const savedSound = localStorage.getItem("alarmSound");
    if (savedSound) setSelected(savedSound);
  }, []);

  const playSound = (id: string, file: string) => {
    const finalFile = isVip && id === "10" ? "/sounds/alert10.mp3" : file;
    const audio = new Audio(finalFile);
    audio.play();
  };

  const selectSound = (id: string) => {
    setSelected(id);
    localStorage.setItem("alarmSound", id);
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div className="text-xl font-bold">🔔 알림 소리 설정</div>
      </div>

      <div className={`mb-4 p-3 rounded-xl text-sm ${
        isVip ? "bg-yellow-100 text-yellow-700" : "bg-gray-200"
      }`}>
        {isVip ? "💎 VIP 활성 상태" : "일반 사용자"}
      </div>

      <div className="flex flex-col gap-2">
        {sounds.map((s) => {
          const isVipOnly = s.id === "10";

          return (
            <div
              key={s.id}
              onClick={() => {
                if (isVipOnly && !isVip) {
                  alert("VIP 전용입니다");
                  return;
                }
                selectSound(s.id);
              }}
              className={`flex items-center justify-between p-4 rounded-xl cursor-pointer
                ${selected === s.id ? "bg-blue-500 text-white" : "bg-white"}
              `}
            >
              <span>{s.name}</span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isVipOnly && !isVip) return alert("VIP 전용");
                  playSound(s.id, s.file);
                }}
              >
                ▶
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}