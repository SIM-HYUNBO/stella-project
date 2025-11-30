"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/app/firebase";
import { updateDoc, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import PageContainer from "@/components/PageContainer";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function EditProfile() {
  const [nickname, setNickname] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [originalNickname, setOriginalNickname] = useState("");
  const [originalProfileImage, setOriginalProfileImage] = useState<string | null>(null);
  const [nicknameChecked, setNicknameChecked] = useState(false);
  const router = useRouter();

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
        setNicknameChecked(true);
      }
    });
    return () => unsub();
  }, []);

  const checkNickname = async () => {
    if (nickname === originalNickname) {
      setNicknameChecked(true);
      return alert("현재 닉네임과 동일합니다.");
    }
    const q = query(collection(db, "users"), where("nickname", "==", nickname));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setNicknameChecked(false);
      return alert("이미 사용 중인 닉네임입니다!");
    }
    setNicknameChecked(true);
    alert("사용 가능한 닉네임입니다!");
  };

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

    if (!nicknameChecked) return alert("닉네임 중복 체크를 해주세요!");

    const changed =
      nickname !== originalNickname || profileImage !== originalProfileImage;

    if (!changed) return alert("변경된 내용이 없습니다!");

    await updateDoc(doc(db, "users", user.uid), { nickname, profileImage });

    alert("프로필이 저장되었습니다!");
    router.push("/");
  };

  return (
    <PageContainer>
      <div className="max-w-md mx-auto mt-16 bg-white shadow p-6 rounded space-y-5">
        <h1 className="text-2xl font-bold text-center text-orange-900">Edit Profile</h1>

        <div className="flex flex-col items-center space-y-3">
          {profileImage && (
            <img src={profileImage} className="w-32 h-32 object-cover rounded-full" />
          )}

          {/* 파일 업로드 버튼 이쁘게 */}
          <label className="bg-orange-300 hover:bg-orange-400 cursor-pointer text-white px-4 py-2 rounded shadow">
            프로필 이미지 선택
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </label>
        </div>

        <div>
          <label className="font-semibold">닉네임</label>
          <div className="flex gap-2 mt-1">
            <input
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setNicknameChecked(false);
              }}
              className="flex-1 border rounded px-3 py-2"
            />
            <button onClick={checkNickname} className="bg-orange-400 hover:bg-orange-500 text-white px-3 rounded">
              중복 확인
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded"
        >
          저장
        </button>
      </div>
    </PageContainer>
  );
}
