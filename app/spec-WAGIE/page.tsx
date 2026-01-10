"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/app/firebase";

type UserProfile = {
  uid: string;
  nickname: string;
  role?: string;
  isPremium?: boolean;
};

export default function PremiumPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setDenied(true);
        setLoading(false);
        return;
      }

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setDenied(true);
        setLoading(false);
        return;
      }

      const userData = snap.data() as UserProfile;

      const isAdmin = userData.role === "관리자";
      

      if (!isAdmin) {
        setDenied(true);
        setLoading(false);
        return;
      }

      // ✅ 통과
      setUserProfile(userData);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* 🔒 로딩 중 */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        🔒 프리미엄 확인 중...
      </div>
    );
  }

  /* 🚫 접근 거부 */
  if (denied || !userProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <h1 className="text-3xl font-bold mb-4">🚫 접근 불가</h1>
        <p className="mb-4">관리자 또는 프리미엄 전용 페이지입니다.</p>
        <a
          href="/pro"
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          프리미엄 구독하러 가기 💎
        </a>
      </div>
    );
  }

  /* 👑 프리미엄 페이지 */
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 to-pink-200 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl p-6">
        <h1 className="text-3xl font-extrabold text-center text-pink-600 mb-4">
          👑 프리미엄 라운지
        </h1>

        <p className="text-center mb-6 text-gray-600">
          {userProfile.nickname} 님은
          <b className="text-pink-500"> 특특특특별한 사람 </b>입니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PremiumCard title="🎨 숨겨진 테마">
            프리미엄 전용 UI 테마 사용 가능
          </PremiumCard>

          <PremiumCard title="🚀 실험 기능">
            아직 공개되지 않은 기능 선사용
          </PremiumCard>

          <PremiumCard title="💬 VIP 채팅">
            관리자 & VIP 전용 채팅방
          </PremiumCard>

          <PremiumCard title="🎁 월간 보상">
            매달 특별한 보상 지급
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}

function PremiumCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-xl p-4 bg-yellow-50">
      <h2 className="font-bold mb-2">{title}</h2>
      <p className="text-sm text-gray-600">{children}</p>
    </div>
  );
}
