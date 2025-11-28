"use client";

import TextAvatar from "@/components/TextAvatar";
import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../app/firebase";

export default function CommentBox() {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 로그인 체크
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 댓글 실시간 가져오기 + 최신 순 + 프로필 변경 실시간 반영
  useEffect(() => {
    const q = query(collection(db, "comments"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list: any[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let userInfo: { nickname?: string; profileImage?: string | null } = {};


        if (data.userId) {
          const userDoc = await getDoc(doc(db, "users", data.userId));
          if (userDoc.exists()) userInfo = userDoc.data();
        }

        list.push({
          id: docSnap.id,
          ...data,
          userNickname: userInfo.nickname || data.userNickname || "익명",
          profileImage: userInfo.profileImage || data.profileImage || null,
          likes: data.likes || [],
        });
      }

      setComments(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 댓글 저장
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!comment.trim()) return;
    if (!user) return alert("로그인 후 이용 가능");

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const nickname = userDoc.exists() ? userDoc.data().nickname : "익명";
    const profileImage = userDoc.exists() ? userDoc.data().profileImage : null;

    try {
      await addDoc(collection(db, "comments"), {
        text: comment,
        userId: user.uid,
        userEmail: user.email,
        userNickname: nickname,
        profileImage,
        likes: [],
        createdAt: Timestamp.now(),
      });
      setComment("");
    } catch (err) {
      console.error("❌ 댓글 저장 실패:", err);
    }
  };

  // 좋아요
  const handleLike = async (id: string, likes: string[] = [], commentUserId: string) => {
    if (!user) return alert("로그인 후 좋아요 가능");
    if (user.uid === commentUserId) return alert("자신의 댓글에는 좋아요 불가!");

    const ref = doc(db, "comments", id);
    const hasLiked = likes.includes(user.uid);

    try {
      await updateDoc(ref, {
        likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });
    } catch (err) {
      console.error("❌ 좋아요 실패:", err);
    }
  };

  // 댓글 삭제
  const handleDelete = async (id: string, commentUserId: string) => {
    if (!user || user.uid !== commentUserId)
      return alert("본인 댓글만 삭제 가능");

    try {
      await deleteDoc(doc(db, "comments", id));
    } catch (err) {
      console.error("❌ 댓글 삭제 실패:", err);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-pink-100 p-4 mt-5 rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-orange-900 mb-2">Communication</h2>

      {/* 입력 */}
      <form onSubmit={handleSubmit} className="flex mb-4 space-x-2">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={user ? "댓글을 입력하세요..." : "로그인 후 이용 가능"}
          className="flex-1 border border-gray-200 rounded px-3 py-2 focus:outline-none"
          disabled={!user}
        />
        <button
          type="submit"
          className={`px-4 py-2 rounded text-white ${
            user ? "bg-blue-400 hover:bg-blue-500" : "bg-gray-400 cursor-not-allowed"
          }`}
          disabled={!user}
        >
          등록
        </button>
      </form>

      {/* 댓글 렌더링 */}
      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : comments.length === 0 ? (
        <p className="text-gray-500">아직 댓글이 없습니다 😄</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="border-b border-gray-200 pb-3 flex items-start space-x-3">
              <TextAvatar nickname={c.userNickname} size={40} profileImage={c.profileImage} />

              <div>
                <p className="font-semibold text-orange-900">
                  {c.userNickname || c.userEmail}
                </p>
                <p className="text-gray-800">{c.text}</p>

                <div className="flex items-center space-x-3 mt-1">
                  <button
                    onClick={() => handleLike(c.id, c.likes || [], c.userId)}
                    className="text-blue-500 hover:text-blue-600 text-sm"
                  >
                    👍 {Array.isArray(c.likes) ? c.likes.length : 0}
                  </button>

                  {user?.uid === c.userId && (
                    <button
                      onClick={() => handleDelete(c.id, c.userId)}
                      className="text-red-500 hover:text-red-600 text-sm"
                    >
                      🗑 삭제
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
