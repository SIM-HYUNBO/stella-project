"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import { auth, db } from "@/app/firebase";

import {
  onAuthStateChanged,
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
} from "firebase/auth";

import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

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

  const profileRef = useRef<HTMLInputElement | null>(null);
  const coverRef = useRef<HTMLInputElement | null>(null);

  /* =========================
      USER LOAD
  ========================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;

      setUser(u);

      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        const data = snap.data();

        setNickname(data.nickname || "");
        setStatus(data.status || "");

        setProfileImage(data.profileImage || null);
        setCoverImage(data.coverImage || null);
      }
    });

    return () => unsub();
  }, []);

  /* =========================
      PROFILE IMAGE
  ========================= */
  const changeProfileImage = (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;

      setProfileImage(base64);

      await updateDoc(doc(db, "users", user.uid), {
        profileImage: base64,
      });
    };

    reader.readAsDataURL(file);
  };

  /* =========================
      COVER IMAGE
  ========================= */
  const changeCoverImage = (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;

      setCoverImage(base64);

      await updateDoc(doc(db, "users", user.uid), {
        coverImage: base64,
      });
    };

    reader.readAsDataURL(file);
  };

  /* =========================
      SAVE NICKNAME
  ========================= */
  const saveNickname = async () => {
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid), {
      nickname,
    });

    await updateProfile(user, {
      displayName: nickname,
    });

    setEditNickname(false);
  };

  /* =========================
      SAVE STATUS
  ========================= */
  const saveStatus = async () => {
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid), {
      status,
    });

    setEditStatus(false);
  };

  /* =========================
      LOGOUT
  ========================= */
  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  /* =========================
      DELETE ACCOUNT
  ========================= */
  const handleDelete = async () => {
    if (!user) return;
    if (!password) return alert("비밀번호 입력");

    try {
      const credential = EmailAuthProvider.credential(
        user.email!,
        password
      );

      await reauthenticateWithCredential(user, credential);
      await deleteUser(user);

      alert("탈퇴 완료");
      router.push("/");
    } catch {
      alert("탈퇴 실패");
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">

      {/* =========================
          BACK BUTTON
      ========================= */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-50 bg-white/80 text-black px-3 py-1 rounded-xl shadow"
      >
        ← 뒤로가기
      </button>

      {/* =========================
          COVER IMAGE
      ========================= */}
      <div
        onClick={() => coverRef.current?.click()}
        className="absolute inset-0"
      >
        {coverImage ? (
          <img
            src={coverImage}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-400 flex items-center justify-center text-white">
            커버 이미지 클릭해서 설정
          </div>
        )}
      </div>

      <input
        type="file"
        ref={coverRef}
        onChange={changeCoverImage}
        className="hidden"
      />

      {/* overlay */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* =========================
          PROFILE AREA
      ========================= */}
      <div className="absolute bottom-8 left-6 text-white flex items-center gap-4">

        {/* PROFILE IMAGE */}
        <div
          onClick={() => profileRef.current?.click()}
          className="w-20 h-20 rounded-full bg-gray-300 overflow-hidden border-2 border-white cursor-pointer"
        >
          {profileImage ? (
            <img
              src={profileImage}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-xs">
              +
            </div>
          )}
        </div>

        <input
          type="file"
          ref={profileRef}
          onChange={changeProfileImage}
          className="hidden"
        />

        {/* TEXT */}
        <div className="flex flex-col">

          {/* NICKNAME */}
          {editNickname ? (
            <div className="flex gap-2">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="text-black px-2 py-1 rounded"
              />
              <button
                onClick={saveNickname}
                className="bg-white text-black px-2 rounded"
              >
                저장
              </button>
            </div>
          ) : (
            <h2
              onClick={() => setEditNickname(true)}
              className="text-xl font-bold cursor-pointer"
            >
              {nickname || "닉네임 없음"}
            </h2>
          )}

          {/* STATUS */}
          {editStatus ? (
            <div className="flex gap-2 mt-1">
              <input
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="text-black px-2 py-1 rounded"
              />
              <button
                onClick={saveStatus}
                className="bg-white text-black px-2 rounded"
              >
                저장
              </button>
            </div>
          ) : (
            <p
              onClick={() => setEditStatus(true)}
              className="text-sm opacity-90 cursor-pointer"
            >
              {status || "상태 메시지"}
            </p>
          )}

          {/* ACTIONS */}
          <div className="mt-4 flex flex-col gap-2">

            <button
              onClick={handleLogout}
              className="bg-white text-black px-3 py-1 rounded"
            >
              로그아웃
            </button>

            <button
              onClick={() => setConfirmDelete(true)}
              className="bg-red-500 text-white px-3 py-1 rounded"
            >
              계정 탈퇴
            </button>

          </div>

        </div>
      </div>

      {/* =========================
          DELETE MODAL
      ========================= */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">

          <div className="bg-white p-6 rounded-xl w-80 space-y-4">

            <h2 className="text-red-600 font-bold">
              계정 탈퇴
            </h2>

            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border px-2 py-1 rounded"
            />

            <div className="flex justify-end gap-2">

              <button
                onClick={handleDelete}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                탈퇴
              </button>

              <button
                onClick={() => setConfirmDelete(false)}
                className="bg-gray-300 px-3 py-1 rounded"
              >
                취소
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}