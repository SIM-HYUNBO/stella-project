"use client";

import { useEffect, useState } from "react";
import PageContainer from "@/components/PageContainer";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, addDoc, updateDoc,
  query, where, limit, orderBy, arrayUnion, arrayRemove,
} from "firebase/firestore";

const MOODS = ["😊", "🥰", "😢", "😡", "😴", "🤔", "🥳", "😌", "🫠", "💪"];
const REACTION_EMOJIS = ["❤️", "🔥", "😂", "😮", "😢", "👏"];

type DiaryEntry = {
  id: string; uid: string; nickname: string; profileImage?: string;
  date: string; content: string; mood: string; isPublic: boolean; createdAt: number;
};
type Comment = {
  id: string; uid: string; nickname: string; content: string;
  createdAt: number; profileImage?: string; likes: string[];
};
type Reply = {
  id: string; uid: string; nickname: string; content: string;
  createdAt: number; profileImage?: string;
};

const formatTime = (ts: number) => {
  const diff = Date.now() - ts;
  if (diff < 60000) return "방금";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return new Date(ts).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
};

const MiniAvatar = ({ nickname, profileImage }: { nickname: string; profileImage?: string }) =>
  profileImage ? (
    <img src={profileImage} className="w-6 h-6 rounded-full object-cover ring-1 ring-white shadow shrink-0" />
  ) : (
    <div className="w-6 h-6 rounded-full bg-sky-200 flex items-center justify-center text-[10px] font-black text-sky-600 shrink-0">
      {nickname[0]}
    </div>
  );

export default function DiaryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [nickname, setNickname] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [tab, setTab] = useState<"mine" | "friends">("mine");
  const [selectedMood, setSelectedMood] = useState("😊");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myEntries, setMyEntries] = useState<DiaryEntry[]>([]);
  const [friendEntries, setFriendEntries] = useState<DiaryEntry[]>([]);
  const [todayEntry, setTodayEntry] = useState<DiaryEntry | null>(null);
  const [editing, setEditing] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const [reactionsByEntry, setReactionsByEntry] = useState<Record<string, Record<string, string[]>>>({});
  const [commentsByEntry, setCommentsByEntry] = useState<Record<string, Comment[]>>({});
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [sendingComment, setSendingComment] = useState<string | null>(null);
  const [repliesByComment, setRepliesByComment] = useState<Record<string, Reply[]>>({});
  const [openReplies, setOpenReplies] = useState<Set<string>>(new Set());
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        setNickname(snap.data().nickname || "");
        setProfileImage(snap.data().profileImage || null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => { if (user) loadMyEntries(); }, [user]);
  useEffect(() => { if (user && tab === "friends") loadFriendEntries(); }, [user, tab]);

  const loadMyEntries = async () => {
    try {
      const snap = await getDocs(query(collection(db, "diaries"), where("uid", "==", user.uid), limit(30)));
      const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DiaryEntry)).sort((a, b) => b.createdAt - a.createdAt);
      setMyEntries(entries);
      const te = entries.find((e) => e.date === today);
      if (te) { setTodayEntry(te); setSelectedMood(te.mood); setContent(te.content); setIsPublic(te.isPublic); }
    } catch (e) { console.error(e); }
  };

  const loadFriendEntries = async () => {
    const friendSnap = await getDocs(query(collection(db, "friends"), where("users", "array-contains", user.uid)));
    const friendUids = friendSnap.docs.flatMap((d) => (d.data().users as string[]).filter((u) => u !== user.uid));
    if (friendUids.length === 0) { setFriendEntries([]); return; }
    const chunks: DiaryEntry[] = [];
    for (let i = 0; i < friendUids.length; i += 10) {
      const snap = await getDocs(query(collection(db, "diaries"), where("uid", "in", friendUids.slice(i, i + 10)), where("isPublic", "==", true), limit(50)));
      snap.docs.forEach((d) => chunks.push({ id: d.id, ...d.data() } as DiaryEntry));
    }
    const sorted = chunks.sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
    setFriendEntries(sorted);
    loadReactionsForEntries(sorted);
  };

  const loadReactionsForEntries = async (entries: DiaryEntry[]) => {
    const result: Record<string, Record<string, string[]>> = {};
    await Promise.all(entries.map(async (entry) => {
      const snap = await getDocs(collection(db, "diaries", entry.id, "reactions"));
      const map: Record<string, string[]> = {};
      snap.docs.forEach((d) => {
        const { emoji, uid } = d.data();
        if (!map[emoji]) map[emoji] = [];
        map[emoji].push(uid);
      });
      result[entry.id] = map;
    }));
    setReactionsByEntry(result);
  };

  const toggleReaction = async (diaryId: string, emoji: string) => {
    if (!user) return;
    const reactionId = `${user.uid}_${emoji.codePointAt(0)}`;
    const reactionRef = doc(db, "diaries", diaryId, "reactions", reactionId);
    const reacted = reactionsByEntry[diaryId]?.[emoji]?.includes(user.uid);
    setReactionsByEntry((prev) => {
      const cur = { ...(prev[diaryId] || {}) };
      cur[emoji] = reacted
        ? (cur[emoji] || []).filter((u) => u !== user.uid)
        : [...(cur[emoji] || []), user.uid];
      return { ...prev, [diaryId]: cur };
    });
    if (reacted) await deleteDoc(reactionRef);
    else await setDoc(reactionRef, { uid: user.uid, emoji, nickname });
  };

  const toggleComments = async (diaryId: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(diaryId)) { next.delete(diaryId); }
      else { next.add(diaryId); if (!commentsByEntry[diaryId]) loadComments(diaryId); }
      return next;
    });
  };

  const loadComments = async (diaryId: string) => {
    const snap = await getDocs(query(collection(db, "diaries", diaryId, "comments"), orderBy("createdAt", "asc")));
    setCommentsByEntry((prev) => ({
      ...prev,
      [diaryId]: snap.docs.map((d) => ({ id: d.id, likes: [], ...d.data() } as Comment)),
    }));
  };

  const submitComment = async (diaryId: string) => {
    const text = commentInputs[diaryId]?.trim();
    if (!text || !user) return;
    setSendingComment(diaryId);
    await addDoc(collection(db, "diaries", diaryId, "comments"), {
      uid: user.uid, nickname, profileImage: profileImage || "",
      content: text, createdAt: Date.now(), likes: [],
    });
    setCommentInputs((prev) => ({ ...prev, [diaryId]: "" }));
    await loadComments(diaryId);
    setSendingComment(null);
  };

  const toggleCommentLike = async (diaryId: string, commentId: string, likes: string[]) => {
    if (!user) return;
    const ref = doc(db, "diaries", diaryId, "comments", commentId);
    const liked = likes.includes(user.uid);
    setCommentsByEntry((prev) => ({
      ...prev,
      [diaryId]: (prev[diaryId] || []).map((c) =>
        c.id === commentId
          ? { ...c, likes: liked ? c.likes.filter((u) => u !== user.uid) : [...c.likes, user.uid] }
          : c
      ),
    }));
    await updateDoc(ref, { likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  const toggleReplies = async (diaryId: string, commentId: string) => {
    setOpenReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) { next.delete(commentId); }
      else { next.add(commentId); if (!repliesByComment[commentId]) loadReplies(diaryId, commentId); }
      return next;
    });
  };

  const loadReplies = async (diaryId: string, commentId: string) => {
    const snap = await getDocs(query(collection(db, "diaries", diaryId, "comments", commentId, "replies"), orderBy("createdAt", "asc")));
    setRepliesByComment((prev) => ({
      ...prev,
      [commentId]: snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reply)),
    }));
  };

  const submitReply = async (diaryId: string, commentId: string) => {
    const text = replyInputs[commentId]?.trim();
    if (!text || !user) return;
    setSendingReply(commentId);
    await addDoc(collection(db, "diaries", diaryId, "comments", commentId, "replies"), {
      uid: user.uid, nickname, profileImage: profileImage || "",
      content: text, createdAt: Date.now(),
    });
    setReplyInputs((prev) => ({ ...prev, [commentId]: "" }));
    await loadReplies(diaryId, commentId);
    setSendingReply(null);
  };

  const handleSave = async () => {
    if (!user || !content.trim()) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "diaries", `${user.uid}_${today}`), {
        uid: user.uid, nickname, profileImage: profileImage || "",
        date: today, content: content.trim(), mood: selectedMood, isPublic, createdAt: Date.now(),
      });
      await loadMyEntries();
      setEditing(false);
    } catch { alert("저장 실패 ㅠ"); }
    finally { setSaving(false); }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  const CommentItem = ({ diaryId, comment }: { diaryId: string; comment: Comment }) => {
    const liked = comment.likes?.includes(user?.uid) ?? false;
    const isOpen = openReplies.has(comment.id);
    const replies = repliesByComment[comment.id] ?? [];

    return (
      <div>
        <div className="flex items-start gap-2">
          <MiniAvatar nickname={comment.nickname} profileImage={comment.profileImage} />
          <div className="flex-1">
            <div className="bg-white rounded-[14px] px-3 py-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[11px] font-black text-slate-700">{comment.nickname}</span>
                <span className="text-[10px] text-gray-400">{formatTime(comment.createdAt)}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{comment.content}</p>
            </div>
            <div className="flex items-center gap-3 mt-1 pl-1">
              <button
                onClick={() => toggleCommentLike(diaryId, comment.id, comment.likes || [])}
                className={`flex items-center gap-0.5 text-[11px] font-bold transition-all active:scale-90 ${liked ? "text-red-400" : "text-gray-400"}`}
              >
                <span>{liked ? "❤️" : "🤍"}</span>
                {comment.likes?.length > 0 && <span>{comment.likes.length}</span>}
              </button>
              <button
                onClick={() => toggleReplies(diaryId, comment.id)}
                className="text-[11px] font-bold text-gray-400 active:scale-90 transition"
              >
                {isOpen ? "닫기" : `↩ 답글${replies.length > 0 ? ` ${replies.length}개` : ""}`}
              </button>
            </div>

            {isOpen && (
              <div className="mt-2 space-y-2 pl-2 border-l-2 border-sky-100">
                {replies.map((r) => (
                  <div key={r.id} className="flex items-start gap-1.5">
                    <MiniAvatar nickname={r.nickname} profileImage={r.profileImage} />
                    <div className="flex-1 bg-white rounded-[12px] px-3 py-1.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-black text-slate-700">{r.nickname}</span>
                        <span className="text-[10px] text-gray-400">{formatTime(r.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-600">{r.content}</p>
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    value={replyInputs[comment.id] || ""}
                    onChange={(e) => setReplyInputs((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && submitReply(diaryId, comment.id)}
                    placeholder="답글 입력..."
                    className="flex-1 h-8 rounded-[10px] bg-white border border-sky-100 px-2.5 text-xs outline-none focus:ring-1 focus:ring-sky-200 text-slate-800 placeholder:text-gray-400"
                  />
                  <button
                    onClick={() => submitReply(diaryId, comment.id)}
                    disabled={!replyInputs[comment.id]?.trim() || sendingReply === comment.id}
                    className="h-8 px-2.5 rounded-[10px] bg-sky-200 text-white text-xs font-black disabled:opacity-40 active:scale-95 transition"
                  >
                    전송
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ReactionBar = ({ diaryId }: { diaryId: string }) => {
    const entryReactions = reactionsByEntry[diaryId] || {};
    const comments = commentsByEntry[diaryId];
    const isOpen = openComments.has(diaryId);

    return (
      <div className="mt-3 pt-3 border-t border-sky-100">
        <div className="flex items-center gap-1.5 flex-wrap">
          {REACTION_EMOJIS.map((emoji) => {
            const uids = entryReactions[emoji] || [];
            const reacted = uids.includes(user?.uid);
            return (
              <button
                key={emoji}
                onClick={() => toggleReaction(diaryId, emoji)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-all active:scale-90 ${
                  reacted ? "bg-sky-200 text-sky-700" : "bg-white text-gray-500 border border-gray-100"
                }`}
              >
                <span>{emoji}</span>
                {uids.length > 0 && <span>{uids.length}</span>}
              </button>
            );
          })}

          <button
            onClick={() => toggleComments(diaryId)}
            className={`ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-90 ${
              isOpen ? "bg-sky-100 text-sky-600" : "text-gray-400 border border-gray-100 bg-white"
            }`}
          >
            <span>💬</span>
            {comments && comments.length > 0 ? <span>{comments.length}</span> : <span>댓글</span>}
          </button>
        </div>

        {isOpen && (
          <div className="mt-3 space-y-3">
            {(commentsByEntry[diaryId] ?? []).map((c) => (
              <CommentItem key={c.id} diaryId={diaryId} comment={c} />
            ))}

            {commentsByEntry[diaryId]?.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-1">첫 댓글을 남겨봐요 👀</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <MiniAvatar nickname={nickname || "나"} profileImage={profileImage ?? undefined} />
              <input
                value={commentInputs[diaryId] || ""}
                onChange={(e) => setCommentInputs((prev) => ({ ...prev, [diaryId]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && submitComment(diaryId)}
                placeholder="댓글 입력..."
                className="flex-1 h-9 rounded-[12px] bg-white border border-sky-100 px-3 text-xs outline-none focus:ring-2 focus:ring-sky-200 text-slate-800 placeholder:text-gray-400"
              />
              <button
                onClick={() => submitComment(diaryId)}
                disabled={!commentInputs[diaryId]?.trim() || sendingComment === diaryId}
                className="h-9 px-3 rounded-[12px] bg-sky-200 text-white text-xs font-black disabled:opacity-40 active:scale-95 transition"
              >
                전송
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageContainer>
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 bg-gray-50" />

      <div className="relative z-10">
        {/* 헤더 */}
        <div className="px-4 py-4">
          <span className="text-xl font-black bg-yellow-200">DIARY</span>
          <div className="text-xs text-gray-400 mt-0.5">일기</div>
        </div>

        {/* 탭 */}
        <div className="mx-5 mt-4 flex bg-white/70 backdrop-blur-sm rounded-[18px] p-1 gap-1">
          {(["mine", "friends"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-[14px] text-sm font-black transition-all ${
                tab === t ? "bg-sky-200 text-white" : "text-sky-600"
              }`}>
              {t === "mine" ? "내 일기" : "친구 일기"}
            </button>
          ))}
        </div>

        <div className="px-5 pb-10 mt-4">
          {tab === "mine" && (
            <>
              <div className="rounded-[24px] bg-white p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-black text-[#d4904a] tracking-widest">TODAY</p>
                    <p className="font-black text-slate-800 text-sm mt-0.5">{formatDate(today)}</p>
                  </div>
                  {todayEntry && !editing && (
                    <button onClick={() => setEditing(true)}
                      className="px-3 py-1.5 rounded-full bg-sky-50 text-sky-600 text-xs font-black">수정 ✏️</button>
                  )}
                </div>

                {todayEntry && !editing ? (
                  <div className="bg-sky-50 rounded-[20px] p-4">
                    <div className="text-3xl mb-2">{todayEntry.mood}</div>
                    <p className="text-slate-800 text-sm leading-relaxed">{todayEntry.content}</p>
                    <p className="mt-3 text-xs text-sky-600 font-semibold">{todayEntry.isPublic ? "🌍 공개" : "🔒 비공개"}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 flex-wrap mb-4">
                      {MOODS.map((m) => (
                        <button key={m} onClick={() => setSelectedMood(m)}
                          className={`text-2xl w-11 h-11 rounded-[14px] transition-all ${
                            selectedMood === m ? "bg-sky-200 scale-110" : "bg-sky-50/50 hover:bg-sky-50"
                          }`}>
                          {m}
                        </button>
                      ))}
                    </div>
                    <textarea value={content} onChange={(e) => setContent(e.target.value)}
                      placeholder="오늘 하루는 어땠어? ✍️" maxLength={200} rows={3}
                      className="w-full text-sm text-slate-800 bg-sky-50/60 rounded-[16px] px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-orange-200 placeholder:text-slate-400"
                    />
                    <div className="text-right text-xs text-slate-400 mb-3">{content.length}/200</div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setIsPublic(!isPublic)}
                        className={`text-xs px-4 py-2 rounded-full font-black transition-all border ${
                          isPublic ? "bg-sky-50 border-sky-300 text-sky-600" : "bg-gray-50 border-gray-200 text-gray-500"
                        }`}>
                        {isPublic ? "🌍 공개" : "🔒 비공개"}
                      </button>
                      <button onClick={handleSave} disabled={saving || !content.trim()}
                        className="px-6 py-2.5 bg-sky-200 text-white text-sm font-black rounded-full disabled:opacity-40 active:scale-[0.97] transition-transform">
                        {saving ? "저장 중..." : "저장 💾"}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <p className="font-black text-slate-800 text-sm mb-3 px-1">지난 일기 📖</p>
              <div className="space-y-3">
                {myEntries.filter((e) => e.date !== today).map((entry) => (
                  <div key={entry.id} className="bg-sky-50 rounded-[22px] p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs text-[#9d7060] font-semibold">{formatDate(entry.date)}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-sky-600">{entry.isPublic ? "🌍" : "🔒"}</span>
                        <span className="text-2xl">{entry.mood}</span>
                      </div>
                    </div>
                    <p className="text-slate-800 text-sm leading-relaxed">{entry.content}</p>
                  </div>
                ))}
                {myEntries.filter((e) => e.date !== today).length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-10">아직 지난 일기가 없어요 🌙</div>
                )}
              </div>
            </>
          )}

          {tab === "friends" && (
            <div className="space-y-3">
              {friendEntries.map((entry) => (
                <div key={entry.id} className="bg-sky-50 rounded-[22px] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {entry.profileImage ? (
                      <img src={entry.profileImage} className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-sky-200 flex items-center justify-center text-sm font-black text-sky-600 shadow">
                        {entry.nickname[0]}
                      </div>
                    )}
                    <span className="font-black text-slate-800 text-sm">{entry.nickname}</span>
                    <span className="text-xs text-sky-600 ml-auto">{formatDate(entry.date)}</span>
                    <span className="text-2xl">{entry.mood}</span>
                  </div>
                  <p className="text-slate-800 text-sm leading-relaxed">{entry.content}</p>
                  <ReactionBar diaryId={entry.id} />
                </div>
              ))}
              {friendEntries.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-10">친구들의 공개 일기가 없어요 🌸</div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
    </PageContainer>
  );
}
