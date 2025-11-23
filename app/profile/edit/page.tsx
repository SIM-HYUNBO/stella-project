"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/app/firebase";
import { updateDoc, doc, getDoc } from "firebase/firestore";
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

  // 파일 선택 → Base64 변환
  const handleImageChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfileImage(reader.result as string);
    reader.readAsDataURL(file);
  };

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
    <div className="max-w-md mx-auto mt-16 bg-white shadow p-6 rounded space-y-5">
      <h1 className="text-2xl font-bold text-center">프로필 수정</h1>

      <div className="flex flex-col items-center space-y-3">
        {profileImage && (
          <img
            src={profileImage}
            className="w-32 h-32 object-cover rounded-full"
          />
        )}
        <input type="file" accept="image/*" onChange={handleImageChange} />
      </div>

      <div>
        <label className="font-semibold">닉네임</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full border rounded px-3 py-2 mt-1"
        />
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded"
      >
        저장
      </button>
    </div>
  );
}
