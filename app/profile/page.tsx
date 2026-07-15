"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";

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
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isWagi, setIsWagi] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [contractStage, setContractStage] = useState(0);
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
        setIsWagi(data.isWagi === true);
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

  const startContract = () => {
    setShowContract(true);
    setContractStage(1);
    setTimeout(() => setContractStage(2), 2200);
    setTimeout(() => setContractStage(3), 3800);
    setTimeout(async () => {
      setContractStage(4);
      if (user) {
        await updateDoc(doc(db, "users", user.uid), { isWagi: true });
        setIsWagi(true);
      }
    }, 4900);
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

          {/* 와기 계약 */}
          {isWagi ? (
            <div className="mb-4 flex items-center justify-center gap-2 py-3 rounded-[18px]"
              style={{ background: "linear-gradient(135deg, #1e0040, #3b0070)", boxShadow: "0 4px 20px rgba(139,92,246,0.35)" }}>
              <span className="text-lg">⚜️</span>
              <span className="font-black text-sm" style={{ color: "#c4b5fd" }}>와기 정식 회원</span>
              <span className="text-lg">⚜️</span>
            </div>
          ) : (
            <button onClick={startContract}
              className="w-full h-12 rounded-[18px] font-black text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2 mb-4"
              style={{ background: "linear-gradient(135deg, #2d0060, #6d28d9)", color: "#e9d5ff", boxShadow: "0 4px 20px rgba(109,40,217,0.4)" }}>
              ⚜️ 와기 계약하기
            </button>
          )}

          {/* 버튼들 */}
          <div className="space-y-3">
            <button onClick={() => setShowQR(true)}
              className="w-full h-12 rounded-[18px] bg-white border border-sky-100 text-sky-700 font-black text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
              📲 QR코드로 친구 추가
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

      {/* 와기 계약 애니메이션 모달 */}
      {showContract && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "#04000f" }}>
          {/* 별 배경 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 60 }).map((_, i) => (
              <div key={i} style={{
                position: "absolute",
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: Math.random() * 3 + 1 + "px",
                height: Math.random() * 3 + 1 + "px",
                borderRadius: "50%",
                background: "#fff",
                opacity: Math.random() * 0.7 + 0.2,
                animation: `twinkle ${Math.random() * 3 + 1.5}s infinite alternate`,
                animationDelay: `${Math.random() * 2}s`,
              }} />
            ))}
          </div>

          <div className="relative flex flex-col items-center gap-6 px-8" style={{ zIndex: 1 }}>

            {/* Stage 1+2+3: 마법진 영역 */}
            <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>

              {/* 마법진 */}
              {contractStage >= 1 && (
                <svg width="240" height="240" viewBox="0 0 240 240" style={{
                  position: "absolute", inset: 0,
                  filter: "drop-shadow(0 0 12px #a855f7) drop-shadow(0 0 30px #7c3aed)",
                }}>
                  {/* 외부 회전 링 */}
                  <circle cx="120" cy="120" r="110" fill="none" stroke="#6d28d9" strokeWidth="1"
                    strokeDasharray="8 6" style={{ transformOrigin: "120px 120px", animation: "rotateCW 8s linear infinite" }} />
                  {/* 반대 방향 링 */}
                  <circle cx="120" cy="120" r="100" fill="none" stroke="#9333ea" strokeWidth="0.5"
                    strokeDasharray="4 10" style={{ transformOrigin: "120px 120px", animation: "rotateCCW 6s linear infinite" }} />
                  {/* 메인 원 드로잉 */}
                  <circle cx="120" cy="120" r="88" fill="none" stroke="#c084fc" strokeWidth="2.5"
                    strokeDasharray="553" strokeDashoffset="553"
                    style={{ animation: "drawCircle 2s ease forwards", transformOrigin: "120px 120px", transform: "rotate(-90deg)" }} />
                  {/* 내부 원 */}
                  <circle cx="120" cy="120" r="60" fill="none" stroke="#7c3aed" strokeWidth="1"
                    strokeDasharray="377" strokeDashoffset="377"
                    style={{ animation: "drawCircle 1.8s 0.3s ease forwards", transformOrigin: "120px 120px", transform: "rotate(-90deg)" }} />
                  {/* 육각별 */}
                  {[0,60,120,180,240,300].map((angle, i) => {
                    const rad = (angle * Math.PI) / 180;
                    const x1 = 120 + 70 * Math.cos(rad);
                    const y1 = 120 + 70 * Math.sin(rad);
                    const x2 = 120 + 70 * Math.cos(rad + Math.PI);
                    const y2 = 120 + 70 * Math.sin(rad + Math.PI);
                    return (
                      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke="#9333ea" strokeWidth="1" opacity="0.6"
                        strokeDasharray="140" strokeDashoffset="140"
                        style={{ animation: `drawCircle 1.2s ${0.4 + i * 0.08}s ease forwards` }} />
                    );
                  })}
                  {/* 룬 점들 */}
                  {[0,45,90,135,180,225,270,315].map((angle, i) => {
                    const rad = (angle * Math.PI) / 180;
                    const x = 120 + 88 * Math.cos(rad);
                    const y = 120 + 88 * Math.sin(rad);
                    return <circle key={i} cx={x} cy={y} r="3" fill="#e879f9"
                      style={{ opacity: 0, animation: `fadeIn 0.3s ${0.8 + i * 0.1}s forwards` }} />;
                  })}
                  {/* 중심 별 */}
                  <circle cx="120" cy="120" r="6" fill="#f0abfc"
                    style={{ opacity: 0, animation: "fadeIn 0.5s 1.5s forwards", filter: "drop-shadow(0 0 6px #e879f9)" }} />
                </svg>
              )}

              {/* Stage 2: 서명 */}
              {contractStage >= 2 && (
                <svg width="160" height="60" viewBox="0 0 160 60" style={{
                  position: "absolute", bottom: 10,
                  filter: "drop-shadow(0 0 6px #c084fc)",
                }}>
                  <path d="M10,40 C20,10 35,50 50,30 C65,10 75,45 95,25 C110,10 120,40 140,20 C148,12 152,30 155,25"
                    fill="none" stroke="#e879f9" strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray="300" strokeDashoffset="300"
                    style={{ animation: "drawSign 1.4s ease forwards" }} />
                  <path d="M10,50 L155,50" fill="none" stroke="#7c3aed" strokeWidth="1" opacity="0.4"
                    strokeDasharray="160" strokeDashoffset="160"
                    style={{ animation: "drawSign 0.8s 0.3s ease forwards" }} />
                </svg>
              )}

              {/* Stage 3: 도장 */}
              {contractStage >= 3 && (
                <div style={{
                  position: "absolute",
                  width: 100, height: 100,
                  borderRadius: "50%",
                  border: "4px solid #dc2626",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column",
                  background: "rgba(220,38,38,0.08)",
                  transform: "rotate(-12deg)",
                  boxShadow: "0 0 0 2px #dc2626, 0 0 20px rgba(220,38,38,0.5)",
                  animation: "stampSlam 0.7s cubic-bezier(0.25,0.46,0.45,0.94) forwards",
                }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: "#dc2626", lineHeight: 1, fontFamily: "serif" }}>契</span>
                  <span style={{ fontSize: 9, fontWeight: 900, color: "#dc2626", letterSpacing: "0.15em" }}>WAGI</span>
                </div>
              )}
            </div>

            {/* Stage 4: 완료 텍스트 */}
            {contractStage >= 4 ? (
              <div className="flex flex-col items-center gap-4" style={{ animation: "fadeIn 0.5s forwards" }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: "#e9d5ff", textAlign: "center" }}>
                  ⚜️ 와기 계약 완료! ⚜️
                </p>
                <p style={{ fontSize: 13, color: "#a78bfa", textAlign: "center" }}>이제 비밀의 방에 입장할 수 있어요</p>
                <button onClick={() => { setShowContract(false); setContractStage(0); }}
                  style={{
                    padding: "12px 40px", borderRadius: 18,
                    background: "linear-gradient(135deg, #6d28d9, #9333ea)",
                    color: "#f3e8ff", fontWeight: 900, fontSize: 14,
                    border: "none", cursor: "pointer",
                    boxShadow: "0 4px 20px rgba(109,40,217,0.5)",
                  }}>확인</button>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#a78bfa", textAlign: "center", animation: "fadeIn 0.5s forwards" }}>
                {contractStage === 1 ? "마법진을 그리는 중..." : contractStage === 2 ? "계약서에 서명하는 중..." : "계약 도장을 찍는 중..."}
              </p>
            )}
          </div>

          <style>{`
            @keyframes twinkle { from { opacity: 0.2; } to { opacity: 1; } }
            @keyframes rotateCW { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes rotateCCW { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
            @keyframes drawCircle { from { stroke-dashoffset: 553; } to { stroke-dashoffset: 0; } }
            @keyframes drawSign { from { stroke-dashoffset: 300; } to { stroke-dashoffset: 0; } }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes stampSlam {
              0% { transform: rotate(-12deg) scale(2.8); opacity: 0; }
              30% { transform: rotate(-12deg) scale(2.8); opacity: 1; }
              65% { transform: rotate(-12deg) scale(0.88); }
              82% { transform: rotate(-12deg) scale(1.06); }
              100% { transform: rotate(-12deg) scale(1); }
            }
          `}</style>
        </div>
      )}

      {/* QR 모달 */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-5" onClick={() => setShowQR(false)}>
          <div className="w-full max-w-xs rounded-[28px] bg-white p-7 flex flex-col items-center gap-5" onClick={(e) => e.stopPropagation()}>
            <p className="font-black text-slate-800 text-lg">내 QR코드</p>
            <div className="p-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <QRCodeSVG
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/add/${encodeURIComponent(nickname)}`}
                size={200}
                level="M"
              />
            </div>
            <p className="text-sm text-gray-400 font-bold text-center">상대방이 이 QR을 스캔하면<br/>친구 요청을 보낼 수 있어요</p>
            <button onClick={() => setShowQR(false)}
              className="w-full h-12 rounded-[18px] bg-sky-50 text-sky-700 font-black text-sm">닫기</button>
          </div>
        </div>
      )}

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
