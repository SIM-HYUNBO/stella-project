"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/app/firebase";
import { onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState(false);
  const [editStatus, setEditStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const originalNicknameRef = useRef<string>("");
  const profileRef = useRef<HTMLInputElement | null>(null);
  const coverRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUser(u);
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        const data = snap.data();
        setNickname(data.nickname || "");
        originalNicknameRef.current = data.nickname || "";
        setStatus(data.status || "");
        setProfileImage(data.profileImage || null);
        setCoverImage(data.coverImage || null);
      }
    });
    return () => unsub();
  }, []);

  const changeProfileImage = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ref = storageRef(storage, `profiles/${user.uid}/avatar`);
    await uploadBytes(ref, file);
    const url = await getDownloadURL(ref);
    setProfileImage(url);
    await updateDoc(doc(db, "users", user.uid), { profileImage: url });
  };

  const changeCoverImage = (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setCoverImage(base64);
      await updateDoc(doc(db, "users", user.uid), { coverImage: base64 });
    };
    reader.readAsDataURL(file);
  };

  const saveNickname = async () => {
    if (!user) return;
    const oldNickname = originalNicknameRef.current;
    const newNickname = nickname.trim();
    if (!newNickname || newNickname === oldNickname) { setEditNickname(false); return; }
    setNicknameSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { nickname: newNickname });
      await updateProfile(user, { displayName: newNickname });
      if (oldNickname) {
        const idToken = await user.getIdToken();
        await fetch("/api/migrate-nickname", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, from: oldNickname, to: newNickname }),
        });
      }
      originalNicknameRef.current = newNickname;
      setEditNickname(false);
    } finally {
      setNicknameSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { status });
    setEditStatus(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!password) return alert("비밀번호 입력");
    try {
      const credential = EmailAuthProvider.credential(user.email!, password);
      await reauthenticateWithCredential(user, credential);
      const idToken = await user.getIdToken();
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, nickname: nickname || user.uid }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "서버 오류");
      alert("탈퇴 완료");
      router.push("/");
    } catch (err: any) {
      alert("탈퇴 실패: " + (err?.message ?? ""));
    }
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden">

      {/* 뒤로가기 */}
      <button onClick={() => router.back()}
        className="absolute top-4 left-4 z-50 flex items-center gap-1.5 bg-black/30 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-bold">
        ← 뒤로가기
      </button>

      {/* 커버 이미지 */}
      <div onClick={() => coverRef.current?.click()} className="relative w-full h-72 cursor-pointer">
        {coverImage ? (
          <img src={coverImage} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-sky-200 flex flex-col items-center justify-center gap-2">
            <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.12)_50%,transparent_60%)] animate-[shimmer_4s_infinite]" />
            <span className="text-4xl">🖼️</span>
            <p className="text-white/80 text-sm font-semibold">커버 이미지 설정하기</p>
          </div>
        )}
        <div className="absolute inset-0 bg-sky-200/50 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-3 right-3 bg-black/30 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">사진 변경</div>
      </div>
      <input type="file" ref={coverRef} onChange={changeCoverImage} className="hidden" />

      {/* 프로필 카드 */}
      <div className="relative z-10 -mt-16 px-5">
        <div className="rounded-[28px] bg-white/90 backdrop-blur-md px-6 pt-6 pb-7">

          {/* 프로필 이미지 */}
          <div className="flex items-end gap-4 -mt-16 mb-5">
            <div onClick={() => profileRef.current?.click()}
              className="relative w-24 h-24 rounded-[22px] bg-sky-200 overflow-hidden cursor-pointer shrink-0">
              {profileImage ? (
                <img src={profileImage} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-3xl">+</div>
              )}
              <div className="absolute bottom-0 right-0 w-7 h-7 bg- rounded-tl-xl flex items-center justify-center text-white text-xs">✏️</div>
            </div>
            <input type="file" ref={profileRef} onChange={changeProfileImage} className="hidden" />
          </div>

          {/* 닉네임 */}
          <div className="mb-3">
            <p className="text-[10px] font-black text-[#d4904a] tracking-widest mb-1">NICKNAME</p>
            {editNickname ? (
              <div className="flex gap-2">
                <input value={nickname} onChange={(e) => setNickname(e.target.value)}
                  className="flex-1 bg-sky-50 rounded-[14px] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-300" />
                <button onClick={saveNickname} disabled={nicknameSaving}
                  className="px-4 py-2 bg-sky-200 text-white rounded-[14px] text-sm font-black disabled:opacity-50">
                  {nicknameSaving ? "저장중..." : "저장"}
                </button>
              </div>
            ) : (
              <button onClick={() => setEditNickname(true)} className="flex items-center gap-2 group">
                <span className="text-xl font-black text-slate-800">{nickname || "닉네임 없음"}</span>
                <span className="text-slate-400 text-sm opacity-0 group-hover:opacity-100 transition">✏️</span>
              </button>
            )}
          </div>

          {/* 상태메시지 */}
          <div className="mb-6">
            <p className="text-[10px] font-black text-[#d4904a] tracking-widest mb-1">STATUS</p>
            {editStatus ? (
              <div className="flex gap-2">
                <input value={status} onChange={(e) => setStatus(e.target.value)}
                  className="flex-1 bg-sky-50 rounded-[14px] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-300" />
                <button onClick={saveStatus}
                  className="px-4 py-2 bg-sky-200 text-white rounded-[14px] text-sm font-black">저장</button>
              </div>
            ) : (
              <button onClick={() => setEditStatus(true)} className="flex items-center gap-2 group">
                <span className="text-sm text-[#9d7060]">{status || "상태 메시지를 입력해보세요"}</span>
                <span className="text-slate-400 text-sm opacity-0 group-hover:opacity-100 transition">✏️</span>
              </button>
            )}
          </div>

          {/* 버튼들 */}
          <div className="space-y-3">
            <button onClick={handleLogout}
              className="w-full h-12 rounded-[18px] bg-white text-sky-800 font-black text-sm active:scale-[0.98] transition-transform">
              로그아웃
            </button>
            <button onClick={() => setConfirmDelete(true)}
              className="w-full h-12 rounded-[18px] bg-red-50 border border-red-100 text-red-500 font-black text-sm active:scale-[0.98] transition-transform">
              계정 탈퇴
            </button>
          </div>
        </div>
      </div>

      {/* 탈퇴 모달 */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-5">
          <div className="w-full max-w-sm rounded-[28px] bg-white/95 border border-red-100 p-7 space-y-4">
            <div className="text-center">
              <span className="text-4xl">😢</span>
              <p className="font-black text-slate-800 text-lg mt-3">정말 탈퇴하시겠어요?</p>
              <p className="text-sky-600 text-sm mt-1">모든 데이터가 삭제되고 복구할 수 없어요.</p>
            </div>
            <input type="password" placeholder="비밀번호 확인" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-red-50 border border-red-100 rounded-[16px] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200" />
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 h-12 rounded-[16px] bg-gray-50 text-sky-800 font-black text-sm">취소</button>
              <button onClick={handleDelete}
                className="flex-1 h-12 rounded-[16px] bg-red-500 text-white font-black text-sm">탈퇴</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </div>
  );
}
