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

export interface Comment {
  id?: string;
  text: string;
  userId: string;
  userNickname?: string;
  likes?: string[];
  parentId?: string | null;
  createdAt?: any;
}

export interface UserProfile {
  uid: string;
  nickname: string;
}

interface CommentBoxProps {
  userProfile?: UserProfile | null;
  postId: string;
}

export default function CommentBox({ userProfile, postId }: CommentBoxProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // 댓글 실시간 조회
  useEffect(() => {
    const colRef = collection(db, "posts", postId, "comments");
    const q = query(colRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Comment[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Comment[];
      setComments(list);
    });

    return () => unsubscribe();
  }, [postId]);

  // 댓글 추가
  const addComment = async (parentId: string | null = null) => {
    if (!userProfile) return;
    const text = parentId ? replyText : commentText;
    if (!text.trim()) return;

    const colRef = collection(db, "posts", postId, "comments");
    await addDoc(colRef, {
      text,
      userId: userProfile.uid,
      userNickname: userProfile.nickname || "익명",
      likes: [],
      parentId: parentId || null,
      createdAt: Timestamp.now(),
    });

    setCommentText("");
    setReplyText("");
    setReplyTargetId(null);
  };

  // 댓글 삭제
  const deleteComment = async (id: string, commentUserId: string) => {
    if (!userProfile || userProfile.uid !== commentUserId) {
      alert("본인 댓글만 삭제할 수 있습니다.");
      return;
    }
    const ref = doc(db, "posts", postId, "comments", id);
    await deleteDoc(ref);
  };

  // 좋아요 토글
  const toggleLike = async (id: string, likes: string[] = []) => {
    if (!userProfile) return;
    const ref = doc(db, "posts", postId, "comments", id);
    const hasLiked = likes.includes(userProfile.uid);

    await updateDoc(ref, {
      likes: hasLiked
        ? arrayRemove(userProfile.uid)
        : arrayUnion(userProfile.uid),
    });
  };

  // 댓글 렌더링 (대댓글 재귀)
  const renderComments = (parentId: string | null = null, level = 0) => {
    return comments
      .filter((c) => (c.parentId ?? null) === parentId)
      .map((c) => (
        <div
          key={c.id}
          style={{ marginLeft: level * 16 }}
          className="border-b border-gray-200 py-2"
        >
          <p className="font-semibold">{c.userNickname}</p>
          <p>{c.text}</p>

          <div className="flex space-x-3 text-sm mt-1">
            <button onClick={() => toggleLike(c.id!, c.likes)}>
              👍 {c.likes?.length || 0}
            </button>

            {userProfile && userProfile.uid === c.userId && (
              <button onClick={() => deleteComment(c.id!, c.userId)}>
                삭제
              </button>
            )}

            {userProfile && userProfile.uid !== c.userId && (
              <button onClick={() => setReplyTargetId(c.id!)}>
                ↳ 답글
              </button>
            )}
          </div>

          {replyTargetId === c.id && userProfile && (
            <div className="flex mt-2 space-x-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="답글 입력..."
                className="flex-1 border px-2 py-1 rounded"
              />
              <button
                onClick={() => addComment(c.id!)}
                className="px-3 py-1 bg-blue-400 text-white rounded"
              >
                등록
              </button>
              <button
                onClick={() => setReplyTargetId(null)}
                className="px-2 py-1 text-gray-500"
              >
                취소
              </button>
            </div>
          )}

          {renderComments(c.id!, level + 1)}
        </div>
      ));
  };

  return (
    <div className="max-w-2xl p-4 bg-pink-50 rounded shadow-md">
      <h2 className="text-xl font-bold mb-2 text-orange-900">댓글</h2>

      {!userProfile ? (
        <p className="text-gray-500">로그인 후 댓글을 작성할 수 있습니다.</p>
      ) : (
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
            className="ml-2 px-4 py-2 bg-blue-400 text-white rounded"
          >
            등록
          </button>
        </div>
      )}

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
