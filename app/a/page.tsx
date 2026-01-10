'use client';
import React, { useEffect, useState } from "react";
import PageContainer from "@/components/PageContainer";
import SketchBook from "@/components/SketchBook";

/* ================= 타입 ================= */
type Reply = { id: number; text: string; };

type Comment = {
  id: number;
  text: string;
  image?: string;
  likes: number;
  liked: boolean; // 좋아요 눌렀는지
  replies: Reply[];
};

/* ================= 페이지 ================= */
export default function ArtPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  /* ===== 로컬스토리지 로드 ===== */
  useEffect(() => {
    const saved = localStorage.getItem("art-comments");
    if (saved) setComments(JSON.parse(saved));
  }, []);

  /* ===== 댓글 상태 저장 ===== */
  const saveComments = (newComments: Comment[]) => {
    setComments(newComments);
    localStorage.setItem("art-comments", JSON.stringify(newComments));
  };

  /* ===== 댓글 추가 ===== */
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

    saveComments([newComment, ...comments]);
    setText("");
    setSelectedImage(null);
  };

  /* ===== 댓글 삭제 ===== */
  const handleDeleteComment = (id: number) => {
    saveComments(comments.filter((c) => c.id !== id));
  };

  /* ===== 좋아요 (중복 방지 + 저장) ===== */
  const handleLikeComment = (id: number) => {
    const newComments = comments.map((c) =>
      c.id === id
        ? c.liked
          ? c
          : { ...c, likes: c.likes + 1, liked: true }
        : c
    );
    saveComments(newComments);
  };

  /* ===== 답글 추가 ===== */
  const handleAddReply = (commentId: number, replyText: string) => {
    if (!replyText) return;

    const newComments = comments.map((c) =>
      c.id === commentId
        ? { ...c, replies: [...c.replies, { id: Date.now(), text: replyText }] }
        : c
    );
    saveComments(newComments);
  };

  /* ===== 이미지 선택 ===== */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <PageContainer>
      <div className="min-h-screen p-8 flex flex-col gap-12">
        <h1 className="text-4xl text-orange-400 text-center">
          내 미술 작품, 소개할 만 하다? 당장 소개!
        </h1>

        <div className="p-6 bg-white/70 rounded-2xl shadow-md max-w-6xl mx-auto w-full">
          <h3 className="text-xl font-semibold text-orange-400 mb-3">
            🎨 SketchBook
          </h3>
          <SketchBook />
        </div>

        <div className="p-6 bg-white/70 rounded-2xl shadow-md max-w-6xl mx-auto w-full">
          <h3 className="text-xl font-semibold text-orange-400 mb-4">
            🧠 미니 테스트
          </h3>
          <MiniTest />
        </div>

        {/* 댓글 영역 */}
        <div className="p-6 bg-white/70 rounded-2xl shadow-md max-w-6xl mx-auto w-full">
          <h3 className="text-xl font-semibold text-orange-400 mb-3">
            🖼 Art Comments
          </h3>

          <textarea
            className="w-full border rounded px-3 py-2 text-sm resize-none mb-2"
            rows={3}
            placeholder="작품에 대한 감상을 남겨보세요..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {selectedImage && (
            <img
              src={selectedImage}
              className="w-24 h-24 object-cover rounded mb-2 cursor-pointer"
              onClick={() => window.open(selectedImage, "_blank")}
            />
          )}

          <div className="flex gap-2 mb-4">
            <label className="px-3 py-2 bg-orange-400 text-white rounded cursor-pointer text-sm">
              📷 이미지
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageChange}
              />
            </label>

            <button
              onClick={handleAddComment}
              className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
            >
              등록
            </button>
          </div>

          {/* 댓글 목록 */}
          <div className="flex flex-col gap-3">
            {comments.map((c) => (
              <CommentCard
                key={c.id}
                comment={c}
                onDelete={() => handleDeleteComment(c.id)}
                onLike={() => handleLikeComment(c.id)}
                onAddReply={(text) => handleAddReply(c.id, text)}
              />
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

/* ================= 댓글 카드 ================= */
function CommentCard({
  comment,
  onDelete,
  onLike,
  onAddReply,
}: {
  comment: Comment;
  onDelete: () => void;
  onLike: () => void;
  onAddReply: (text: string) => void;
}) {
  const [replyText, setReplyText] = useState("");

  return (
    <div className="border rounded p-4 bg-white">
      <p className="text-sm">{comment.text}</p>

      {comment.image && (
        <img
          src={comment.image}
          className="w-24 h-24 object-cover rounded mt-2 cursor-pointer"
          onClick={() => window.open(comment.image, "_blank")}
        />
      )}

      <div className="flex gap-4 text-xs mt-3">
        <button
          onClick={onLike}
          disabled={comment.liked}
          className={comment.liked ? "opacity-50 cursor-not-allowed" : "hover:underline"}
        >
          ❤️ {comment.likes}
        </button>
        <button onClick={onDelete} className="hover:underline">
          삭제
        </button>
      </div>

      {/* 답글 */}
      <div className="flex gap-2 mt-3">
        <input
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          className="flex-1 border rounded px-2 py-1 text-xs"
          placeholder="답글 달기..."
        />
        <button
          onClick={() => {
            onAddReply(replyText);
            setReplyText("");
          }}
          className="px-3 py-1 bg-gray-300 rounded text-xs hover:bg-gray-400"
        >
          등록
        </button>
      </div>

      <div className="pl-4 mt-2 flex flex-col gap-1">
        {comment.replies.map((r) => (
          <div key={r.id} className="text-xs bg-gray-100 rounded px-2 py-1">
            💬 {r.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= 미니 테스트 ================= */
function MiniTest() {
  const [answer, setAnswer] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p>그림을 비유할 수 있는 단어. 당신에게 가장 좋은 느낌을 주는 단어는?</p>

      <div className="flex gap-3">
        {["따뜻함", "몽환적", "강렬함", "차분함"].map((v) => (
          <button
            key={v}
            onClick={() => setAnswer(v)}
            className="px-3 py-2 bg-orange-100 rounded hover:bg-orange-200"
          >
            {v}
          </button>
        ))}
      </div>

      {answer && (
        <p className="text-orange-500 font-semibold">
          👉 당신의 선택: {answer}
        </p>
      )}
    </div>
  );
}
