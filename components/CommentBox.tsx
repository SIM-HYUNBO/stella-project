"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
  Timestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/app/firebase";

interface Comment {
  id?: string;
  text: string;
  userId: string;
  userNickname?: string;
  likes?: string[];
  parentId?: string | null;
  createdAt?: any;
}

interface UserProfile {
  uid: string;
  nickname: string;
}

// userProfile prop이 없어도 null 기본값
export default function CommentBox({ userProfile }: { userProfile?: UserProfile | null }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // userProfile 없으면 렌더링 안 함
  if (!userProfile) return null;

  useEffect(() => {
    const colRef = collection(db, "comments", "posts");
    const q = query(colRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Comment[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Comment));
      setComments(list);
    });

    return () => unsubscribe();
  }, []);

  const addComment = async (parentId: string | null = null) => {
    if (!commentText.trim() && !replyText.trim()) return;

    const colRef = collection(db, "comments", "posts");
    const text = parentId ? replyText : commentText;

    await addDoc(colRef, {
      text,
      userId: userProfile.uid,
      userNickname: userProfile.nickname || "익명",
      likes: [],
      createdAt: Timestamp.now(),
      parentId: parentId || null,
    });

    parentId ? setReplyText("") : setCommentText("");
    setReplyTargetId(null);
  };

  const deleteComment = async (id: string, commentUserId: string) => {
    if (userProfile.uid !== commentUserId) return alert("본인 댓글만 삭제 가능");
    const ref = doc(db, "comments", "posts", id);
    await deleteDoc(ref);
  };

  const toggleLike = async (id: string, likes: string[]) => {
    const ref = doc(db, "comments", "posts", id);
    const hasLiked = likes.includes(userProfile.uid);
    await updateDoc(ref, { likes: hasLiked ? arrayRemove(userProfile.uid) : arrayUnion(userProfile.uid) });
  };

  const renderComments = (parentId: string | null = null, level = 0) => {
    return comments
      .filter((c) => (c.parentId || null) === parentId)
      .map((c) => (
        <div key={c.id} className={`pl-${level * 4} border-b border-gray-200 py-2`}>
          <p className="font-semibold">{c.userNickname}</p>
          <p>{c.text}</p>
          <div className="flex space-x-2 text-sm mt-1">
            <button onClick={() => toggleLike(c.id!, c.likes || [])}>
              👍 {c.likes?.length || 0}
            </button>
            {userProfile.uid === c.userId && (
              <button onClick={() => deleteComment(c.id!, c.userId)}>삭제</button>
            )}
            {userProfile.uid !== c.userId && !replyTargetId && (
              <button onClick={() => setReplyTargetId(c.id!)}>↳ 답글</button>
            )}
          </div>

          {replyTargetId === c.id && (
            <div className="flex mt-2 space-x-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="답글을 입력하세요..."
                className="flex-1 border px-2 py-1 rounded"
              />
              <button
                onClick={() => addComment(c.id!)}
                className="px-3 py-1 bg-blue-400 text-white rounded hover:bg-blue-500"
              >
                등록
              </button>
              <button onClick={() => setReplyTargetId(null)} className="px-2 py-1 text-gray-500">
                취소
              </button>
            </div>
          )}

          <div>{renderComments(c.id!, level + 1)}</div>
        </div>
      ));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 bg-pink-50 rounded shadow-md">
      <h2 className="text-xl font-bold mb-2">댓글창</h2>

      <div className="flex mb-4">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="댓글 입력..."
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={() => addComment()}
          className="ml-2 px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500"
        >
          등록
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-gray-500">아직 댓글이 없습니다 😄</p>
        ) : (
          renderComments()
        )}
      </div>
    </div>
  );
}
