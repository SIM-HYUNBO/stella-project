// pages/art.tsx
"use client";

import React, { useState } from "react";
import PageContainer from "@/components/PageContainer";
import { useRouter } from "next/navigation";
import SketchBook from "../../components/SketchBook";

type Comment = {
  id: number;
  text: string;
  image?: string;
  likes: number;
  liked?: boolean; // 중복 방지
  replies: Reply[];
};

type Reply = {
  id: number;
  text: string;
};

const ArtPage: React.FC = () => {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleAddComment = () => {
    if (!text && !selectedImage) return;

    const newComment: Comment = {
      id: Date.now(),
      text,
      image: selectedImage || undefined,
      likes: 0,
      liked: false,
      replies: [],
    };

    setComments([newComment, ...comments]);
    setText("");
    setSelectedImage(null);
  };

  const handleDeleteComment = (id: number) => {
    setComments(comments.filter((c) => c.id !== id));
  };

  const handleLikeComment = (id: number) => {
    setComments(
      comments.map((c) =>
        c.id === id
          ? c.liked
            ? c
            : { ...c, likes: c.likes + 1, liked: true }
          : c
      )
    );
  };

  const handleAddReply = (commentId: number, replyText: string) => {
    if (!replyText) return;

    setComments(
      comments.map((c) =>
        c.id === commentId
          ? { ...c, replies: [...c.replies, { id: Date.now(), text: replyText }] }
          : c
      )
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => setSelectedImage(null);

  return (
    <PageContainer>
      <div className="flex w-full h-screen">
        <div className="flex-1 flex flex-col p-8 overflow-y-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-5xl text-orange-400 dark:text-white">Art</h1>
            <button
              onClick={() => router.push("/study")}
              className="text-orange-600 dark:text-white hover:underline text-lg"
            >
              « back
            </button>
          </div>

          <p className="text-2xl text-orange-900 dark:text-white mb-8">
            Explore and create amazing artworks.
          </p>

          {/* 스케치북 */}
          <div className="p-6 bg-white/70 dark:bg-gray-800/70 rounded-2xl shadow-md max-w-4xl mb-6">
            <h3 className="text-xl font-semibold text-orange-400 mb-3">🎨 SketchBook</h3>
            <SketchBook />
          </div>

          {/* 댓글창 */}
          <div className="p-6 bg-white/70 dark:bg-gray-800/70 rounded-2xl shadow-md max-w-4xl mb-6">
            <h3 className="text-xl font-semibold text-orange-400 mb-3">🖼 Art Comments</h3>

            {/* 입력창 */}
            <div className="flex flex-col gap-2 mb-4">
              <textarea
                className="w-full border rounded px-3 py-2 text-sm resize-none"
                rows={3}
                placeholder="댓글을 작성하세요..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              {selectedImage && (
                <div className="relative w-24 h-24 mb-2">
                  <img
                    src={selectedImage}
                    alt="첨부 이미지"
                    className="w-full h-full object-cover rounded cursor-pointer"
                    onClick={() => window.open(selectedImage, "_blank")}
                  />
                  <button
                    onClick={removeImage}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* 이미지 첨부 버튼 */}
                <label className="px-3 py-2 bg-orange-400 text-white rounded cursor-pointer text-sm">
                  📷 이미지
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>

                <button
                  onClick={handleAddComment}
                  className="px-4 py-2 bg-orange-600 text-white rounded text-sm"
                >
                  등록
                </button>
              </div>
            </div>

            {/* 댓글 목록 */}
            <div className="flex flex-col gap-3">
              {comments.map((c) => (
                <CommentCard
                  key={c.id}
                  comment={c}
                  onDelete={() => handleDeleteComment(c.id)}
                  onLike={() => handleLikeComment(c.id)}
                  onAddReply={(replyText) => handleAddReply(c.id, replyText)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

type CommentCardProps = {
  comment: Comment;
  onDelete: () => void;
  onLike: () => void;
  onAddReply: (replyText: string) => void;
};

const CommentCard: React.FC<CommentCardProps> = ({ comment, onDelete, onLike, onAddReply }) => {
  const [replyText, setReplyText] = useState("");

  return (
    <div className="border rounded p-2 bg-white/80 dark:bg-gray-700/80">
      {comment.text && <p className="text-sm text-gray-800 dark:text-white">{comment.text}</p>}
      {comment.image && (
        <img
          src={comment.image}
          alt="댓글 이미지"
          className="mt-1 w-24 h-24 object-cover rounded cursor-pointer"
          onClick={() => window.open(comment.image, "_blank")}
        />
      )}

      <div className="flex gap-3 mt-2 text-xs text-gray-600 dark:text-gray-300">
        <button
          onClick={onLike}
          className={`hover:underline ${comment.liked ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={comment.liked}
        >
          ❤️ {comment.likes}
        </button>
        <button onClick={onDelete} className="hover:underline">
          삭제
        </button>
      </div>

      {/* 답글 입력 */}
      <div className="mt-2 flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1 text-xs"
          placeholder="답글 달기..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
        />
        <button
          onClick={() => {
            onAddReply(replyText);
            setReplyText("");
          }}
          className="px-2 py-1 bg-gray-300 rounded text-xs"
        >
          등록
        </button>
      </div>

      {/* 답글 목록 */}
      <div className="mt-2 pl-4 flex flex-col gap-1">
        {comment.replies.map((r) => (
          <div key={r.id} className="text-xs bg-gray-100 dark:bg-gray-600 rounded px-2 py-1">
            💬 {r.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArtPage;
