"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { callRequest } from "@/lib/video-call-client";
import type { VideoCall } from "@/lib/video-call";

export default function InviteCallFriend({ call, client, onClose }: { call: VideoCall; client: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [friends, setFriends] = useState<{ uid: string; nickname: string }[]>([]);
  const [loading, setLoading] = useState(true), [pending, setPending] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]), [message, setMessage] = useState("");
  const busy = useRef(false);
  useEffect(() => {
    dialog.current?.showModal();
    let cancelled = false;
    callRequest(`?id=${encodeURIComponent(call.id)}&friends=1`).then(data => { if (!cancelled) setFriends(data.friends || []); })
      .catch(() => { if (!cancelled) setMessage("친구 목록을 불러오지 못했어. 닫고 다시 열어 줘."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [call.id]);
  const invite = async (uid: string) => {
    if (busy.current) return;
    busy.current = true; setPending(uid); setMessage("");
    try { await callRequest("", { action: "invite", id: call.id, toUid: uid, client }); setSent(prev => [...prev, uid]); setMessage("초대했어! 친구가 수락하면 함께 연결돼."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "초대하지 못했어. 다시 눌러 줘."); }
    finally { busy.current = false; setPending(null); }
  };
  return createPortal(<dialog ref={dialog} aria-labelledby="invite-video-title" onCancel={onClose} className="m-auto w-80 max-w-[92vw] rounded-3xl bg-white p-6 text-slate-800 backdrop:bg-black/50">
    <div className="flex items-center justify-between"><h2 id="invite-video-title" className="font-bold">친구 초대</h2><button aria-label="초대 창 닫기" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div>
    <p className="mb-4 mt-2 text-xs text-gray-500">초대받은 친구가 수락하면 참여해 · 최대 4명</p>
    <div className="max-h-[50vh] overflow-y-auto space-y-2">
      {loading ? <p className="text-sm text-gray-400">친구 목록 불러오는 중…</p> : friends.length === 0 ? <p className="text-sm text-gray-400">초대할 친구가 없어.</p> : friends.map(friend => {
        const member = call.members.find(m => m.uid === friend.uid);
        const included = !!member || sent.includes(friend.uid);
        return <button key={friend.uid} disabled={included || !!pending || call.members.length + sent.filter(id => !call.members.some(m => m.uid === id)).length >= 4}
          onClick={() => invite(friend.uid)} className="flex w-full items-center justify-between rounded-xl bg-sky-50 px-3 py-3 text-sm disabled:opacity-50">
          <span>{friend.nickname}</span><span className="text-xs text-sky-600">{member?.state === "joined" ? "참여 중" : member?.state === "left" ? "나감" : included ? "초대됨" : pending === friend.uid ? "보내는 중…" : "초대"}</span>
        </button>;
      })}
    </div>
    {message && <p role="status" className="mt-4 text-sm text-sky-700">{message}</p>}
  </dialog>, document.body);
}
