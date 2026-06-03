"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/app/firebase";
import TextAvatar from "@/components/TextAvatar";

type UserInfo = {
  nickname: string;
  profileImage?: string | null;
  email?: string;
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${value ? "bg-orange-400" : "bg-gray-200"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? "translate-x-6" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [saving, setSaving] = useState(false);

  const [notifications, setNotifications] = useState(false);
  const [appLock, setAppLock] = useState(false);
  const [sound, setSound] = useState(true);

  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStep, setPinStep] = useState<"enter" | "confirm">("enter");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { router.replace("/login"); return; }
      setUid(firebaseUser.uid);
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (snap.exists()) {
        setUser({
          nickname: snap.data().nickname || "유저",
          profileImage: snap.data().profileImage || null,
          email: firebaseUser.email || "",
        });
        setEditNickname(snap.data().nickname || "");
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setNotifications(localStorage.getItem("notificationsEnabled") === "true");
    setAppLock(localStorage.getItem("appLockEnabled") === "true");
    setSound(localStorage.getItem("soundEnabled") !== "false");
  }, []);

  const handleNotifications = (v: boolean) => {
    setNotifications(v);
    localStorage.setItem("notificationsEnabled", String(v));
  };

  const handleSound = (v: boolean) => {
    setSound(v);
    localStorage.setItem("soundEnabled", String(v));
  };

  const handleAppLock = (v: boolean) => {
    if (v) {
      setShowPinSetup(true);
      setNewPin(""); setConfirmPin(""); setPinStep("enter"); setPinError("");
    } else {
      setAppLock(false);
      localStorage.setItem("appLockEnabled", "false");
      localStorage.removeItem("appLockPin");
      sessionStorage.removeItem("appLockUnlocked");
    }
  };

  const pressPinKey = (digit: string) => {
    if (pinStep === "enter") {
      if (newPin.length >= 4) return;
      const next = newPin + digit;
      setNewPin(next);
      if (next.length === 4) setTimeout(() => setPinStep("confirm"), 200);
    } else {
      if (confirmPin.length >= 4) return;
      const next = confirmPin + digit;
      setConfirmPin(next);
      if (next.length === 4) {
        setTimeout(() => {
          if (next === newPin) {
            localStorage.setItem("appLockPin", next);
            localStorage.setItem("appLockEnabled", "true");
            sessionStorage.setItem("appLockUnlocked", "true");
            setAppLock(true);
            setShowPinSetup(false);
          } else {
            setPinError("PIN이 일치하지 않습니다");
            setConfirmPin("");
          }
        }, 100);
      }
    }
  };

  const delPinKey = () => {
    if (pinStep === "enter") setNewPin((p) => p.slice(0, -1));
    else setConfirmPin((p) => p.slice(0, -1));
    setPinError("");
  };

  const saveNickname = async () => {
    if (!uid || !editNickname.trim()) return;
    setSaving(true);
    await updateDoc(doc(db, "users", uid), { nickname: editNickname.trim() });
    setUser((prev) => prev ? { ...prev, nickname: editNickname.trim() } : prev);
    setSaving(false);
    setEditMode(false);
  };

  const navItems = [
    { icon: "ℹ️", label: "앱 정보", path: "/tools/appinfo" },
    { icon: "🎧", label: "Q&A방", path: "/tools/contact" },
    { icon: "🎫", label: "칭호", path: "/titles" },
  ];

  const pinCurrent = pinStep === "enter" ? newPin : confirmPin;
  const pinKeys = ["1","2","3","4","5","6","7","8","9","","0","←"];

  return (
    <main className="relative min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="flex items-center h-14 px-4 bg-white border-b border-gray-100 sticky top-0 z-20">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-400 font-bold text-lg mr-3">←</button>
        <span className="font-black text-[#3d1f00] text-base">⚙️ 설정</span>
      </div>

      <div className="px-5 pt-5 pb-20 space-y-4">

        {/* 내 정보 */}
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">내 정보</span>
            <button
              onClick={() => editMode ? saveNickname() : setEditMode(true)}
              disabled={saving}
              className="px-3 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-500 text-xs font-black transition"
            >
              {saving ? "저장 중..." : editMode ? "저장" : "수정"}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <TextAvatar nickname={user?.nickname || "유"} size={52} profileImage={user?.profileImage} />
            </div>
            <div className="flex-1 min-w-0">
              {editMode ? (
                <input
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full font-black text-[#3d1f00] text-base bg-orange-50 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-orange-200"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && saveNickname()}
                />
              ) : (
                <div className="font-black text-[#3d1f00] text-base">{user?.nickname || "..."}</div>
              )}
              <div className="text-xs text-gray-400 mt-0.5 truncate">{user?.email || ""}</div>
            </div>
          </div>
        </div>

        {/* 앱 설정 토글 */}
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">앱 설정</span>
          </div>

          {[
            { label: "푸쉬 알림", icon: "🔔", value: notifications, onChange: handleNotifications },
            { label: "앱 비밀번호", icon: "🔒", value: appLock, onChange: handleAppLock },
            { label: "소리", icon: "🔊", value: sound, onChange: handleSound },
          ].map(({ label, icon, value, onChange }, i, arr) => (
            <div
              key={label}
              className={`flex items-center justify-between px-5 py-4 ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-lg shadow-sm">
                  {icon}
                </div>
                <span className="font-bold text-[#3d1f00] text-sm">{label}</span>
              </div>
              <Toggle value={value} onChange={onChange} />
            </div>
          ))}
        </div>

        {/* 기능 버튼들 */}
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">기능</span>
          </div>
          {navItems.map(({ icon, label, path }, i) => (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={`w-full flex items-center justify-between px-5 py-4 active:bg-orange-50 transition ${i < navItems.length - 1 ? "border-b border-gray-50" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-lg shadow-sm">{icon}</div>
                <span className="font-bold text-[#3d1f00] text-sm">{label}</span>
              </div>
              <span className="text-orange-300 text-lg font-bold">›</span>
            </button>
          ))}
        </div>

      </div>

      {/* PIN 설정 모달 */}
      {showPinSetup && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-orange-50 to-amber-50">
          <button onClick={() => setShowPinSetup(false)} className="absolute top-5 right-5 text-gray-400 text-2xl">✕</button>

          <div className="text-5xl mb-5">🔒</div>
          <div className="text-xl font-black text-[#3d1f00] mb-1">
            {pinStep === "enter" ? "새 PIN 설정" : "PIN 확인"}
          </div>
          <div className="text-sm text-gray-400 mb-8">
            {pinStep === "enter" ? "사용할 4자리 PIN을 입력하세요" : "한 번 더 입력하세요"}
          </div>

          <div className="flex gap-4 mb-3">
            {[0,1,2,3].map((i) => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < pinCurrent.length ? "bg-orange-400 border-orange-400" : "border-gray-300"
              }`} />
            ))}
          </div>
          {pinError && <p className="text-red-400 text-xs font-bold mb-3">{pinError}</p>}
          <div className="mb-8 h-4" />

          <div className="grid grid-cols-3 gap-3 w-64">
            {pinKeys.map((k, i) => (
              k === "" ? <div key={i} /> :
              k === "←" ? (
                <button key={i} onClick={delPinKey}
                  className="h-16 rounded-2xl bg-white border border-gray-100 shadow-sm text-2xl text-gray-500 flex items-center justify-center active:scale-95 transition">
                  ←
                </button>
              ) : (
                <button key={i} onClick={() => pressPinKey(k)}
                  className="h-16 rounded-2xl bg-white border border-gray-100 shadow-sm text-2xl font-black text-[#3d1f00] flex items-center justify-center active:scale-95 active:bg-orange-50 transition">
                  {k}
                </button>
              )
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
