"use client";
/* eslint-disable @next/next/no-img-element -- Generated local SVG/PNG previews and user-uploaded data URLs. */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, orderBy, where, getDocs, Timestamp } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Settings, Pencil, ImagePlus, QrCode, LogOut, Bell, ChevronRight, Camera, Check, X } from "lucide-react";
import ProfileActivityChart from "@/components/ProfileActivityChart";
import LoadingScreen from "@/components/LoadingScreen";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const originalStatus = useRef("");
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const originalNicknameRef = useRef<string>("");
  const profileRef = useRef<HTMLInputElement | null>(null);
  const coverRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setUser(null); setLoading(false); router.replace("/login"); return; }
      setUser(u);
      try {
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        if (auth.currentUser?.uid !== u.uid) return;
        const data = snap.data();
        const nick = data.nickname || "";
        setNickname(nick);
        originalNicknameRef.current = nick;
        setStatus(data.status || "");
        setProfileImage(data.profileImage || null);
        setCoverImage(data.coverImage || null);
        setCoverGradient(data.coverGradient || null);
        setLoading(false);
        // 알림 로드
        try {
          const monthAgo = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const nSnap = await getDocs(
            query(collection(db, "notifications", nick, "items"),
              where("createdAt", ">=", monthAgo),
              orderBy("createdAt", "desc"))
          );
          setNotifications(nSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch {}
      }
      } catch { setLoadError("프로필을 불러오지 못했어. 연결 상태를 확인한 뒤 다시 열어 줘."); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, [router]);

  const compressImage = (file: File, maxPx: number, quality: number): Promise<string> =>
    new Promise((resolve, reject) => {
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
        img.onerror = () => reject(Error("사진을 읽지 못했어."));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(Error("사진을 읽지 못했어."));
      reader.readAsDataURL(file);
    });

  const changeProfileImage = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const base64 = await compressImage(file, 300, 0.7);
      await updateDoc(doc(db, "users", user.uid), { profileImage: base64, avatarEnabled: false });
      setProfileImage(base64);
    } catch { setLoadError("프로필 사진을 저장하지 못했어. 다시 시도해 줘."); }
  };

  const changeCoverImage = async (e: any) => {
    const file = e.target.files?.[0]; if (!file || !user) return;
    try { const image = await compressImage(file, 900, 0.75); await updateDoc(doc(db, "users", user.uid), { coverImage: image }); setCoverImage(image); }
    catch { setLoadError("배경을 저장하지 못했어. 다시 시도해 줘."); }
  };
  const saveNickname = async () => {
    if (!user) return;
    const oldNickname = originalNicknameRef.current;
    const newNickname = nickname.trim();
    if (!newNickname || newNickname === oldNickname) { setEditNickname(false); return; }
    setNicknameSaving(true);
    try {
      if (oldNickname) {
        const idToken = await user.getIdToken();
        const response = await fetch("/api/migrate-nickname", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, from: oldNickname, to: newNickname }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw Error(result.error || "닉네임을 변경하지 못했어.");
      }
      await updateProfile(user, { displayName: newNickname });
      originalNicknameRef.current = newNickname;
      setEditNickname(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "닉네임을 변경하지 못했어.");
    } finally {
      setNicknameSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!user) return;
    if (statusSaving) return;
    setStatusSaving(true);
    try { await updateDoc(doc(db, "users", user.uid), { status: status.trim().slice(0, 100) }); setStatus(status.trim().slice(0, 100)); setEditStatus(false); }
    catch { setLoadError("상태 메시지를 저장하지 못했어. 다시 시도해 줘."); }
    finally { setStatusSaving(false); }
  };

  const handleLogout = async () => {
    try {
      await (await import("@/app/hooks/usePushSubscription")).disconnectPush();
      await signOut(auth);
      router.push("/");
    } catch (error) { alert(error instanceof Error ? error.message : "다시 로그아웃해 줘."); }
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

  if (loading) return <LoadingScreen />;
  if (!user) return null;
  return <div className={styles.page}>
    <header className={styles.header}><button type="button" aria-label="뒤로가기" onClick={() => router.back()} className={styles.iconButton}><ArrowLeft size={21} strokeWidth={1.7} /></button><span>내 프로필</span><button type="button" aria-label="설정" onClick={() => router.push("/tools")} className={styles.iconButton}><Settings size={20} strokeWidth={1.6} /></button></header>
    <main className={styles.content}>
      {loadError && <p role="alert" className={styles.error}>{loadError}<button type="button" aria-label="안내 닫기" onClick={() => setLoadError("")}><X size={15} /></button></p>}
      <section className={styles.hero} style={{ background: coverGradient || undefined }}>
        {coverImage && <img src={coverImage} alt="내 프로필 배경" className={styles.coverImage} />}
        <div className={styles.heroTop}><span className={styles.heroTag}><span />MY PROFILE</span><button type="button" onClick={() => coverRef.current?.click()} aria-label="프로필 배경 바꾸기" className={styles.coverButton}><ImagePlus size={17} /></button></div>
        <p className={styles.heroIntro}>오늘도, <span>나답게.</span></p>
        <button type="button" onClick={() => profileRef.current?.click()} className={styles.avatarStage} aria-label="프로필 사진 바꾸기"><span className={styles.avatarHalo} /><img src={profileImage || "/wag.png"} alt="내 프로필 사진" className={styles.photoImage} /><span className={styles.avatarEdit}><Camera size={14} /></span></button>
        <div className={styles.identity}>
          {editNickname ? <form className={styles.inlineForm} onSubmit={event => { event.preventDefault(); void saveNickname(); }}><input autoFocus aria-label="닉네임" maxLength={30} value={nickname} disabled={nicknameSaving} onChange={event => setNickname(event.target.value)} /><button type="submit" disabled={nicknameSaving} aria-label="닉네임 저장"><Check size={18} /></button><button type="button" disabled={nicknameSaving} aria-label="닉네임 수정 취소" onClick={() => { setNickname(originalNicknameRef.current); setEditNickname(false); }}><X size={18} /></button></form> : <button type="button" className={styles.nickname} onClick={() => setEditNickname(true)}><h1>{nickname || "나의 프로필"}</h1><Pencil size={14} /></button>}
          {editStatus ? <form className={styles.inlineForm} onSubmit={event => { event.preventDefault(); void saveStatus(); }}><input autoFocus aria-label="상태 메시지" maxLength={100} value={status} disabled={statusSaving} onChange={event => setStatus(event.target.value)} /><button type="submit" disabled={statusSaving} aria-label="상태 메시지 저장"><Check size={18} /></button><button type="button" disabled={statusSaving} aria-label="상태 메시지 수정 취소" onClick={() => { setStatus(originalStatus.current); setEditStatus(false); }}><X size={18} /></button></form> : <button type="button" className={styles.statusMessage} onClick={() => { originalStatus.current = status; setEditStatus(true); }}>{status || "오늘의 나를 한 줄로 남겨 봐"}<Pencil size={12} /></button>}
        </div>
        <div className={styles.heroActions}><button type="button" className={styles.customize} onClick={() => profileRef.current?.click()}><Camera size={17} />프로필 사진 바꾸기</button></div>
      </section>
      <ProfileActivityChart uid={user.uid} />
      <section className={styles.menuCard} aria-label="프로필 메뉴"><button type="button" onClick={() => setShowQR(true)}><span className={styles.menuIcon}><QrCode size={20} strokeWidth={1.6} /></span><span><b>내 친구 초대장</b><small>QR코드로 더 가깝게</small></span><ChevronRight size={17} /></button><button type="button" onClick={() => setShowNotifications(value => !value)} aria-expanded={showNotifications}><span className={styles.menuIcon}><Bell size={19} strokeWidth={1.6} /></span><span><b>최근 알림</b><small>최근 한 달의 소식</small></span><ChevronRight size={17} /></button>
        {showNotifications && <div className={styles.notifications}>{notifications.length ? notifications.map(n => <button type="button" key={n.id} onClick={() => { if (typeof n.url === "string" && n.url.startsWith("/") && !n.url.startsWith("//")) router.push(n.url); }}><strong>{n.from || "WAGIE"}</strong><p>{n.message}</p></button>) : <p>최근 한 달 알림이 없어.</p>}</div>}
        <button type="button" onClick={handleLogout}><span className={styles.menuIcon}><LogOut size={19} strokeWidth={1.6} /></span><span><b>로그아웃</b><small>다음에 또 만나</small></span><ChevronRight size={17} /></button></section>
      <div className={styles.pageFoot}><span>나답게, WAGIE.</span><button type="button" onClick={() => setConfirmDelete(true)}>계정 탈퇴</button></div>
    </main>
    <input type="file" accept="image/*" ref={profileRef} onChange={changeProfileImage} className="hidden" />
    <input type="file" accept="image/*" ref={coverRef} onChange={changeCoverImage} className="hidden" />
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


  </div>;
}
