"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/app/firebase";
import { updateDoc, doc, getDoc } from "firebase/firestore";
import PageContainer from "@/components/PageContainer";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function EditProfile() {
  const [nickname, setNickname] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [originalNickname, setOriginalNickname] = useState("");
  const [originalProfileImage, setOriginalProfileImage] = useState<string | null>(null);
  const router = useRouter();

  // 로그인 유저 & 기존 정보 불러오기
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.push("/");
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setNickname(data.nickname);
        setOriginalNickname(data.nickname);
        setProfileImage(data.profileImage || null);
        setOriginalProfileImage(data.profileImage || null);
      }
    });
    return () => unsub();
  }, []);

  // 이미지 파일 → Base64 변환
  const handleImageChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfileImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  // 저장
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const changed =
      nickname !== originalNickname || profileImage !== originalProfileImage;

    if (!changed) return alert("변경된 내용이 없습니다!");

    await updateDoc(doc(db, "users", user.uid), {
      nickname,
      profileImage,
    });

    alert("프로필이 저장되었습니다!");
    router.push("/");
  };

  return (
    <PageContainer>
      <div className="max-w-md mx-auto mt-16 bg-white shadow p-6 rounded space-y-6">
        <h1 className="text-2xl font-bold text-center text-orange-900">User Profile</h1>

        {/* 프로필 이미지 + 업로드 버튼 */}
        <div className="flex flex-col items-center space-y-3">
          {profileImage && (
            <img
              src={profileImage}
              className="w-32 h-32 object-cover rounded-full shadow-md"
            />
          )}

          {/* 숨긴 파일 input */}
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />

          {/* 커스텀 버튼 */}
          <label
            htmlFor="fileInput"
            className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow transition"
          >
            프로필 사진 변경
          </label>
        </div>

        {/* 닉네임 */}
        <div>
          <label className="font-semibold text-orange-800">닉네임</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-orange-300 outline-none"
          />
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg font-semibold shadow transition"
        >
          저장
        </button>
      </div>
    </PageContainer>
  );
}
