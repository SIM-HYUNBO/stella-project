"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

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
  const [coverGradient, setCoverGradient] = useState<string | null>(null);
  const [showAIGen, setShowAIGen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{ gradient: string; status: string; emoji: string } | null>(null);
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
        setCoverGradient(data.coverGradient || null);
      }
    });
    return () => unsub();
  }, []);

  const compressImage = (file: File, maxPx: number, quality: number): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;
          const size = Math.min(side, maxPx);
          const canvas = document.createElement("canvas");
          canvas.width = size; canvas.height = size;
          canvas.getContext("2d")!.drawImage(img, sx, sy, side, side, 0, 0, size, size);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });

  const changeProfileImage = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const base64 = await compressImage(file, 300, 0.7);
    setProfileImage(base64);
    await updateDoc(doc(db, "users", user.uid), { profileImage: base64 });
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

  const generateAIProfile = async () => {
    if (!aiInput.trim() || aiGenerating) return;
    setAiGenerating(true);
    setAiResult(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "profile", messages: [{ role: "user", content: aiInput.trim() }] }),
      });
      if (!res.ok || !res.body) throw new Error("생성 실패");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try { const d = JSON.parse(raw).choices?.[0]?.delta?.content; if (d) full += d; } catch {}
        }
      }
      let gradient = "", status = "", emoji = "";
      for (const line of full.split("\n")) {
        if (line.startsWith("GRADIENT:")) gradient = line.replace("GRADIENT:", "").trim();
        if (line.startsWith("STATUS:")) status = line.replace("STATUS:", "").trim();
        if (line.startsWith("EMOJI:")) emoji = line.replace("EMOJI:", "").trim();
      }
      if (gradient) setAiResult({ gradient, status, emoji });
    } catch {}
    finally { setAiGenerating(false); }
  };

  const applyGradient = async () => {
    if (!aiResult || !user) return;
    setCoverGradient(aiResult.gradient);
    setCoverImage(null);
    await updateDoc(doc(db, "users", user.uid), { coverGradient: aiResult.gradient, coverImage: null });
    setShowAIGen(false);
  };

  const applyStatus = async () => {
    if (!aiResult || !user) return;
    setStatus(aiResult.status);
    await updateDoc(doc(db, "users", user.uid), { status: aiResult.status });
    setShowAIGen(false);
  };

  const applyBoth = async () => {
    if (!aiResult || !user) return;
    setCoverGradient(aiResult.gradient);
    setCoverImage(null);
    setStatus(aiResult.status);
    await updateDoc(doc(db, "users", user.uid), { coverGradient: aiResult.gradient, coverImage: null, status: aiResult.status });
    setShowAIGen(false);
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
        ) : coverGradient ? (
          <div className="w-full h-full" style={{ background: coverGradient }} />
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
        <div className="rounded-[28px] bg-white px-6 pt-6 pb-7" style={{ boxShadow: "0 -4px 30px rgba(0,0,0,0.08)" }}>

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
            <button onClick={() => { setShowAIGen(true); setAiResult(null); setAiInput(""); }}
              className="w-full h-12 rounded-[18px] text-white font-black text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #f59e0b, #a855f7)", boxShadow: "0 4px 20px rgba(168,85,247,0.3)" }}>
              ✨ AI 프로필 생성기
            </button>
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

      {/* AI 프로필 생성기 모달 */}
      {showAIGen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-lg rounded-t-[32px] bg-white px-6 pt-5 pb-10 space-y-4" style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}>

            {/* 헤더 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-gray-800 text-lg">✨ AI 프로필 생성기</p>
                <p className="text-xs text-gray-400 mt-0.5">원하는 분위기를 말해봐</p>
              </div>
              <button onClick={() => setShowAIGen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">✕</button>
            </div>

            {/* 예시 칩 */}
            <div className="flex gap-2 flex-wrap">
              {["귀여운 고양이 감성", "차가운 도시 느낌", "봄날 오후 햇살", "신비로운 우주", "레트로 필름"].map(ex => (
                <button key={ex} onClick={() => setAiInput(ex)}
                  className="px-3 py-1 rounded-full text-[11px] font-bold border border-purple-200 text-purple-600 bg-purple-50 active:scale-95 transition">
                  {ex}
                </button>
              ))}
            </div>

            {/* 입력 */}
            <div className="flex gap-2">
              <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") generateAIProfile(); }}
                placeholder="예: 따뜻한 오후 카페, 어두운 보라빛 밤..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-purple-300 transition" />
              <button onClick={generateAIProfile} disabled={aiGenerating || !aiInput.trim()}
                className="px-4 py-3 rounded-2xl text-white text-sm font-black disabled:opacity-40 transition active:scale-95"
                style={{ background: "linear-gradient(135deg, #f59e0b, #a855f7)" }}>
                {aiGenerating ? "⏳" : "생성"}
              </button>
            </div>

            {/* 생성 중 */}
            {aiGenerating && (
              <div className="flex items-center gap-2 py-2">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#a855f7", animationDelay: `${d}ms` }} />
                ))}
                <span className="text-xs text-gray-400 ml-1">AI가 프로필 만드는 중...</span>
              </div>
            )}

            {/* 결과 미리보기 */}
            {aiResult && (
              <div className="space-y-3">
                <div className="rounded-2xl overflow-hidden h-36 flex items-end relative"
                  style={{ background: aiResult.gradient }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="relative z-10 px-4 pb-3">
                    <p className="text-2xl mb-1">{aiResult.emoji}</p>
                    <p className="text-white text-sm font-semibold">{aiResult.status}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button onClick={applyGradient}
                    className="py-2.5 rounded-xl text-[11px] font-black text-white active:scale-95 transition"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #fb923c)" }}>
                    커버만 적용
                  </button>
                  <button onClick={applyStatus}
                    className="py-2.5 rounded-xl text-[11px] font-black text-white active:scale-95 transition"
                    style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}>
                    상태만 적용
                  </button>
                  <button onClick={applyBoth}
                    className="py-2.5 rounded-xl text-[11px] font-black text-white active:scale-95 transition"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #a855f7)" }}>
                    둘 다 적용
                  </button>
                </div>

                <button onClick={() => { setAiResult(null); setAiInput(""); }}
                  className="w-full py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 transition">
                  다시 생성하기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </div>
  );
}
