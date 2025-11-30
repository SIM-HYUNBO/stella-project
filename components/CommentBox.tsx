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
import { db, auth, messaging } from "../app/firebase"; // messaging 추가
import { getToken, onMessage } from "firebase/messaging"; // FCM import

interface Comment {
  id: string;
  text: string;
  userId: string;
  userEmail: string;
  userNickname: string;
  profileImage?: string | null;
  likes: string[];
  createdAt: any;
  parentId?: string | null;
}

export default function CommentBox() {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const [newReplyAlert, setNewReplyAlert] = useState<string | null>(null); // ✅ FCM 알림 표시

  // 로그인 체크
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // ✅ FCM 토큰 등록 + 알림 수신
  useEffect(() => {
    if (!user) return;

    const registerFCM = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const token = await getToken(messaging, { vapidKey: "YOUR_VAPID_KEY" });
          console.log("FCM 토큰:", token);
          if (token) {
            await updateDoc(doc(db, "users", user.uid), {
              fcmTokens: arrayUnion(token),
            });
          }
        }
      } catch (err) {
        console.error("FCM 토큰 등록 실패:", err);
      }
    };

    registerFCM();

    const unsubscribeMessage = onMessage(messaging, (payload) => {
      console.log("푸시 알림 수신:", payload);
      setNewReplyAlert(payload.notification?.body || "새 알림이 도착했습니다!");
      setTimeout(() => setNewReplyAlert(null), 5000); // 5초 후 자동 사라짐
    });

    return () => unsubscribeMessage();
  }, [user]);

  // 댓글 실시간 가져오기
  useEffect(() => {
    const q = query(collection(db, "comments"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list: Comment[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let userInfo: { nickname?: string; profileImage?: string | null } = {};
        if (data.userId) {
          const userDoc = await getDoc(doc(db, "users", data.userId));
          if (userDoc.exists()) userInfo = userDoc.data();
        }
        list.push({
          id: docSnap.id,
          text: data.text || "",
          userId: data.userId || "",
          userEmail: data.userEmail || "",
          userNickname: userInfo.nickname || data.userNickname || "익명",
          profileImage: userInfo.profileImage || data.profileImage || null,
          likes: Array.isArray(data.likes) ? data.likes : [],
          createdAt: data.createdAt || Timestamp.now(),
          parentId: data.parentId || null,
        });
      }
      setComments(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 댓글 저장
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, parentId: string | null = null) => {
    e.preventDefault();
    if (!comment.trim() && !replyText.trim()) return;
    if (!user) return alert("로그인 후 이용 가능");

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const nickname = userDoc.exists() ? userDoc.data().nickname : "익명";
    const profileImage = userDoc.exists() ? userDoc.data().profileImage : null;

    try {
      if (parentId) {
        await addDoc(collection(db, "comments"), {
          text: replyText,
          userId: user.uid,
          userEmail: user.email,
          userNickname: nickname,
          profileImage,
          likes: [],
          parentId,
          createdAt: Timestamp.now(),
        });
        setReplyText("");
        setReplyTargetId(null);
      } else {
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
      }
    } catch (err) {
      console.error("❌ 댓글 저장 실패:", err);
    }
  };

  // 댓글 수정, 좋아요, 삭제, 렌더링 등 기존 코드 그대로
  const handleEdit = async (id: string) => {
    if (!editingText.trim()) return;
    try {
      await updateDoc(doc(db, "comments", id), { text: editingText });
      setEditingCommentId(null);
      setEditingText("");
    } catch (err) {
      console.error("❌ 댓글 수정 실패:", err);
    }
  };

  const handleLike = async (id: string, likes: string[] = [], commentUserId: string) => {
    if (!user) return alert("로그인 후 좋아요 가능");
    if (user.uid === commentUserId) return alert("자신의 댓글에는 좋아요 불가!");
    const ref = doc(db, "comments", id);
    const hasLiked = likes.includes(user.uid);
    try {
      await updateDoc(ref, { likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
    } catch (err) {
      console.error("❌ 좋아요 실패:", err);
    }
  };

  const handleDelete = async (id: string, commentUserId: string) => {
    if (!user || user.uid !== commentUserId) return alert("본인 댓글만 삭제 가능");
    try { await deleteDoc(doc(db, "comments", id)); } 
    catch (err) { console.error("❌ 댓글 삭제 실패:", err); }
  };

  const formatDate = (timestamp: any) => {
    const date = timestamp.toDate();
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
  };

  const renderComments = (parentId: string | null = null, level = 0) => {
    return comments
      .filter((c) => (c.parentId || null) === parentId)
      .map((c) => (
        <div key={c.id} className={`border-b border-gray-200 pb-3 flex flex-col space-y-1 ml-${level * 5}`}>
          <div className="flex items-center space-x-3">
            <TextAvatar nickname={c.userNickname} size={40} profileImage={c.profileImage} />
            <p className="font-semibold text-orange-900">{c.userNickname || c.userEmail}</p>
            <p className="text-gray-500 text-sm">{formatDate(c.createdAt)}</p>
          </div>

          {editingCommentId === c.id ? (
            <div className="flex space-x-2 mt-1">
              <input value={editingText} onChange={(e) => setEditingText(e.target.value)} className="flex-1 border px-2 py-1 rounded" />
              <button onClick={() => handleEdit(c.id)} className="text-blue-500">저장</button>
              <button onClick={() => setEditingCommentId(null)} className="text-gray-500">취소</button>
            </div>
          ) : (
            <p className="text-gray-800">{c.text}</p>
          )}

          <div className="flex items-center space-x-3 mt-1">
            <button onClick={() => handleLike(c.id, c.likes || [], c.userId)} className="text-blue-500 hover:text-blue-600 text-sm">👍 {Array.isArray(c.likes) ? c.likes.length : 0}</button>
            {user?.uid === c.userId && editingCommentId !== c.id && (
              <button onClick={() => { setEditingCommentId(c.id); setEditingText(c.text); }} className="text-yellow-500 text-sm">✏ 수정</button>
            )}
            {user?.uid === c.userId && (
              <button onClick={() => handleDelete(c.id, c.userId)} className="text-red-500 hover:text-red-600 text-sm">🗑 삭제</button>
            )}
            {user?.uid !== c.userId && !replyTargetId && (
              <button onClick={() => setReplyTargetId(c.id)} className="text-green-600 text-sm">↳ 답글</button>
            )}
          </div>

          {replyTargetId === c.id && (
            <form onSubmit={(e) => handleSubmit(e, c.id)} className="flex space-x-2 mt-1 ml-12">
              <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="답글을 입력하세요..." className="flex-1 border px-2 py-1 rounded" />
              <button type="submit" className="text-blue-500">등록</button>
              <button onClick={() => setReplyTargetId(null)} className="text-gray-500">취소</button>
            </form>
          )}

          <div className="ml-8">{renderComments(c.id, level + 1)}</div>
        </div>
      ));
  };

  return (
    <div className="w-full max-w-2xl bg-pink-100 p-4 mt-5 rounded-lg shadow-md relative">
      {newReplyAlert && (
        <div className="absolute top-0 right-0 m-4 bg-yellow-300 p-2 rounded shadow-lg">
          {newReplyAlert}
        </div>
      )}

      <h2 className="text-xl font-bold text-orange-900 mb-2">Communication</h2>

      <form onSubmit={(e) => handleSubmit(e)} className="flex mb-4 space-x-2">
        <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={user ? "댓글을 입력하세요..." : "로그인 후 이용 가능"} className="flex-1 border border-gray-200 rounded px-3 py-2 focus:outline-none" disabled={!user} />
        <button type="submit" className={`px-4 py-2 rounded text-white ${user ? "bg-blue-400 hover:bg-blue-500" : "bg-gray-400 cursor-not-allowed"}`} disabled={!user}>등록</button>
      </form>

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : comments.length === 0 ? (
        <p className="text-gray-500">아직 댓글이 없습니다 😄</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">{renderComments()}</div>
      )}
    </div>
  );
}
