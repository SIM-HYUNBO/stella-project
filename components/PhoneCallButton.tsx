"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/app/firebase";
import VideoCallButton from "@/components/VideoCallButton";

function PhoneIcon({ size = 20 }: { size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.83a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" />
  </svg>;
}

/** One header button: phone-app audio calls or in-app video calls. */
export default function PhoneCallButton({ userId, nickname, color }: { userId: string; nickname: string; color: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    let cancelled = false;
    setLoading(true);
    setPhone("");
    setMessage("");
    getDoc(doc(db, "users", userId)).then(snapshot => {
      if (cancelled) return;
      const value = snapshot.data()?.phone;
      const number = typeof value === "string" ? value.trim() : "";
      if (/^\+?[\d\s()-]{3,30}$/.test(number)) setPhone(number);
      else setMessage("등록된 전화번호가 없어.");
    }).catch(() => {
      if (!cancelled) setMessage("전화번호를 불러오지 못했어. 잠시 후 다시 눌러 줘.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, userId]);

  const close = () => { dialog.current?.close(); setOpen(false); };
  return <>
    <button type="button" title="통화하기" aria-label={`${nickname}에게 통화하기`} onClick={() => setOpen(true)}
      className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/70 hover:bg-white active:scale-95 transition" style={{ color }}>
      <PhoneIcon />
    </button>
    {open && createPortal(
      <dialog ref={dialog} aria-label={`${nickname}에게 통화하기`} onCancel={close} onClose={() => setOpen(false)}
        onClick={e => { if (e.target === e.currentTarget) close(); }}
        className="m-auto w-72 max-w-[90vw] rounded-[28px] bg-white p-0 backdrop:bg-black/50">
        <div className="px-6 py-7 flex flex-col items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-green-100 text-green-500 flex items-center justify-center"><PhoneIcon size={26} /></div>
          <div className="text-center" aria-live="polite">
            <p className="text-lg font-black text-slate-800">{nickname}</p>
            <p className="mt-1 text-sm text-gray-500">어떻게 통화할까?</p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            {phone ? <a href={`tel:${phone.replace(/[\s()-]/g, "")}`} onClick={close}
              className="w-full rounded-[14px] bg-green-50 text-green-700 px-4 py-3 flex items-center gap-3"><PhoneIcon /><span className="text-left"><span className="block font-bold text-sm">음성통화</span><span className="block text-xs mt-1">{phone} · 전화 앱</span></span></a>
              : <div className="rounded-[14px] bg-gray-50 px-4 py-3 text-sm text-gray-400"><span className="font-bold">음성통화</span><p className="mt-1 text-xs" role="status">{loading ? "전화번호 확인 중…" : message}</p></div>}
            <VideoCallButton userId={userId} nickname={nickname} onStarted={close} />
            <button autoFocus type="button" onClick={close} className="w-full h-10 rounded-[14px] text-gray-500 font-bold text-sm">취소</button>
          </div>
        </div>
      </dialog>, document.body)}
  </>;
}
