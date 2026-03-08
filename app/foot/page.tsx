"use client";

import { useEffect, useState } from "react";
import { db } from "@/app/firebase";
import { doc, getDoc } from "firebase/firestore";
import { watchAuthState } from "@/app/authService";

export default function ProfileInfo() {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = watchAuthState(async (user) => {
      if (!user) return;

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    });

    return () => unsubscribe();
  }, []);

  if (!userData) return <div className="p-6">불러오는 중...</div>;

  const maskPhone = (phone: string) => {
    return phone?.replace(/(\d{3})-\d{4}-(\d{4})/, "$1-****-$2");
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-xl shadow">

      <h2 className="text-xl font-bold mb-6 text-center">프로필</h2>

      {/* 프로필 사진 */}
      <div className="flex justify-center mb-6">
       <img
  src={userData.profileImage || "/default-profile.png"}
  className="w-24 h-24 rounded-full object-cover"
/>
      </div>

      <div className="space-y-4">

        <div className="flex justify-between">
          <span className="font-semibold">닉네임</span>
          <span>{userData.nickname}</span>
        </div>

        <div className="flex justify-between">
          <span className="font-semibold">이메일</span>
          <span>{userData.email}</span>
        </div>

        <div className="flex justify-between">
          <span className="font-semibold">비밀번호</span>
          <span>******</span>
        </div>

        <div className="flex justify-between">
          <span className="font-semibold">생년월일</span>
          <span>{userData.birth}</span>
        </div>

        <div className="flex justify-between">
          <span className="font-semibold">전화번호</span>
          <span>{maskPhone(userData.phone)}</span>
        </div>

      </div>

    </div>
  );
}