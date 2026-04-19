"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  /* 초기 로딩 */
  useEffect(() => {
    const vip = localStorage.getItem("vip") === "true";
    const savedSound = localStorage.getItem("alarmSound");

    setIsVip(vip);
    if (savedSound) setSelected(savedSound);
  }, []);

  /* 🔊 알림 재생 */
  const playSound = (id: string, file: string) => {
    const vip = localStorage.getItem("vip") === "true";

    // VIP인데 일반 알림 선택해도 VIP 전용 유지 가능하게 하고 싶으면 여기 조절
    const finalFile =
      vip && id === "10" ? "/sounds/alert10.mp3" : file;

    const audio = new Audio(finalFile);
    audio.play();
  };

  /* 선택 저장 */
  const selectSound = (id: string) => {
    setSelected(id);
    localStorage.setItem("alarmSound", id);
  };

  /* VIP 해제 대응 */
  useEffect(() => {
    const interval = setInterval(() => {
      const vip = localStorage.getItem("vip") === "true";
      setIsVip(vip);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
  <div className="min-h-screen p-4 bg-gray-50">

    {/* 헤더 */}
    <div className="flex items-center gap-2 mb-4">
      <button onClick={() => router.back()} className="text-xl">
        ←
      </button>

      <div className="text-xl font-bold">
        🔔 알림 소리 설정
      </div>
    </div>

    {/* VIP 상태 */}
    <div className={`mb-4 p-3 rounded-xl text-sm ${
      isVip ? "bg-yellow-100 text-yellow-700" : "bg-gray-200"
    }`}>
      {isVip ? "💎 VIP 활성 상태 (VIP 전용 소리 사용 가능)" : "일반 사용자 상태"}
    </div>

    {/* 리스트 */}
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
            className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition
              ${selected === s.id ? "bg-blue-500 text-white" : "bg-white"}
            `}
          >

            <div className="flex items-center gap-2">
              {selected === s.id && <span>✔</span>}
              <span>
                {s.name}
                {isVipOnly && (
                  <span className="ml-2 text-xs text-pink-500">
                    VIP
                  </span>
                )}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();

                if (isVipOnly && !isVip) {
                  alert("VIP 전용 소리입니다");
                  return;
                }

                playSound(s.id, s.file);
              }}
              className="text-sm px-3 py-1 rounded bg-black/10"
            >
              ▶ 테스트
            </button>

          </div>
        );
      })}
    </div>

  </div>
);
}