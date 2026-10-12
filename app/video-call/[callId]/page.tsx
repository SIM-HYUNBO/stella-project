"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/app/firebase";
import { callRequest, mediaError } from "@/lib/video-call-client";
import { memberOf, validCallId, type VideoCall } from "@/lib/video-call";
import { CallMesh } from "@/lib/call-mesh";
import CallActionButton from "@/components/CallActionButton";
import CallVideoTile from "@/components/CallVideoTile";
import InviteCallFriend from "@/components/InviteCallFriend";

type Phase = "loading" | "incoming" | "preparing" | "ringing" | "connecting" | "connected" | "ended";
export default function VideoCallPage() {
  const { callId: id } = useParams<{ callId: string }>();
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null), [call, setCall] = useState<VideoCall | null>(null);
  const [phase, setPhase] = useState<Phase>("loading"), [message, setMessage] = useState("");
  const [muted, setMuted] = useState(false), [cameraOff, setCameraOff] = useState(false);
  const [seconds, setSeconds] = useState(0), [showInvite, setShowInvite] = useState(false);
  const [clientId, setClientId] = useState("");
  // This selection never goes to Firestore or to another participant.
  const [largeUid, setLargeUid] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const stream = useRef<MediaStream | null>(null);
  const start = useRef<() => void>(() => {}), end = useRef<() => void>(() => {});

  useEffect(() => onAuthStateChanged(auth, user => {
    setUid(user?.uid || null);
    if (!user) { setMessage("로그인한 뒤 다시 통화에 들어와 줘."); setPhase("ended"); }
  }), []);
  useEffect(() => {
    if (!uid) return;
    if (!validCallId(id)) { setMessage("잘못된 통화 주소야."); setPhase("ended"); return; }
    let disposed = false, terminal = false, attempted = false, busy = false, joined = false;
    let current: VideoCall | null = null, mesh: CallMesh | null = null;
    let iceServers: RTCIceServer[] = [];
    let timer: ReturnType<typeof setTimeout>, lastSuccess = Date.now();
    const connected = new Set<string>();
    const client = crypto.randomUUID();
    setClientId(client); setCall(null); setMessage(""); setPhase("loading"); setMuted(false); setCameraOff(false);
    setSeconds(0); setRemoteStreams({}); setLargeUid(null); setShowInvite(false);
    const release = () => {
      mesh?.close(); mesh = null;
      stream.current?.getTracks().forEach(track => { track.onended = null; track.stop(); });
      stream.current = null;
      if (!disposed) { setLocalStream(null); setRemoteStreams({}); setShowInvite(false); }
    };
    const notifyEnd = () => callRequest("", { action: "end", id, client }, true).catch(() => {});
    const finish = (text: string, notify: boolean) => {
      if (terminal) return;
      terminal = true; clearTimeout(timer); release();
      if (!disposed) { setMessage(text); setPhase("ended"); }
      if (notify) void notifyEnd();
    };
    end.current = () => finish("통화에서 나왔어.", !!current);
    const updatePhase = () => {
      if (disposed || terminal || busy || !joined || !current) return;
      setPhase(connected.size ? "connected" : current.members.some(m => m.uid !== uid && m.state === "joined") ? "connecting" : "ringing");
    };
    const begin = async () => {
      if (busy || terminal || disposed || !current) return;
      const me = memberOf(current, uid);
      if (!me || me.state === "left") { finish("이미 나간 통화야.", false); return; }
      if (me.client && me.client !== client) { finish("다른 창에서 이미 통화 중이야.", false); return; }
      attempted = true; busy = true; setPhase("preparing"); setMessage("");
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error("HTTPS 주소의 최신 브라우저에서 다시 열어 줘.");
        const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
        if (disposed || terminal) { media.getTracks().forEach(t => t.stop()); return; }
        stream.current = media; setLocalStream(media);
        media.getTracks().forEach(track => { track.onended = () => finish("카메라나 마이크 연결이 끊어졌어.", true); });
        await callRequest("", { action: "join", id, client });
        joined = true;
        if (disposed || terminal) { void notifyEnd(); return; }
        mesh = new CallMesh(uid, media, iceServers,
          (peerUid, action, description) => callRequest("", { action, id, client, peerUid, description }),
          (peerUid, remote) => { if (!disposed && !terminal) setRemoteStreams(previous => { const next = { ...previous }; if (remote) next[peerUid] = remote; else delete next[peerUid]; return next; }); },
          (peerUid, online) => { online ? connected.add(peerUid) : connected.delete(peerUid); updatePhase(); },
          () => { if (!disposed && !terminal) setMessage("일부 친구와 영상 연결이 어려워. 네트워크를 확인해 줘."); });
      } catch (e) { if (!disposed && !terminal) finish(mediaError(e), true); }
      finally { busy = false; updatePhase(); }
    };
    start.current = () => { void begin(); };
    const poll = async () => {
      try {
        const result = await callRequest(`?id=${encodeURIComponent(id)}&client=${client}`);
        if (disposed || terminal) return;
        lastSuccess = Date.now(); current = result.call || null; setCall(current); iceServers = result.iceServers || [];
        if (!current || current.status === "ended") { finish("통화가 종료됐어.", false); return; }
        const me = memberOf(current, uid);
        if (!me || me.state === "left") { finish("통화 초대가 만료됐거나 이미 나왔어.", false); return; }
        if (me.client && me.client !== client) { finish("다른 창에서 이미 통화 중이야. 그 창으로 돌아가 줘.", false); return; }
        if (!attempted) { if (current.fromUid === uid) void begin(); else setPhase("incoming"); }
        if (joined && me.state === "joined") mesh?.sync(current);
        updatePhase();
      } catch (e) {
        if (!disposed && !terminal) {
          if (!current || Date.now() - lastSuccess > 20000) finish(mediaError(e), joined);
          else setMessage("통화 상태를 확인하고 있어…");
        }
      }
      if (!disposed && !terminal) timer = setTimeout(poll, 2000);
    };
    const leave = () => finish("통화에서 나왔어.", joined || attempted);
    window.addEventListener("pagehide", leave); void poll();
    return () => {
      disposed = true; window.removeEventListener("pagehide", leave); clearTimeout(timer); release();
      if (!terminal && (joined || attempted)) void notifyEnd();
      terminal = true; start.current = () => {}; end.current = () => {};
    };
  }, [id, uid]);
  useEffect(() => {
    if (phase !== "connected") return;
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);
  const toggleMic = () => { stream.current?.getAudioTracks().forEach(t => { t.enabled = muted; }); setMuted(!muted); };
  const toggleCamera = () => { stream.current?.getVideoTracks().forEach(t => { t.enabled = cameraOff; }); setCameraOff(!cameraOff); };
  const others = call?.members.filter(m => m.uid !== uid && m.state !== "left") || [];
  const partner = others.map(m => m.name).join(", ") || "영상통화";
  const tiles = call?.members.filter(m => m.uid === uid || m.state === "joined") || [];
  const focused = tiles.some(m => m.uid === largeUid) ? largeUid : tiles.find(m => m.uid !== uid)?.uid || uid;
  const small = tiles.filter(m => m.uid !== focused);
  const status: Record<Phase, string> = { loading: "통화 확인 중…", incoming: "영상통화에 초대됐어", preparing: "카메라와 마이크 준비 중…", ringing: "친구를 기다리고 있어", connecting: "연결 중…", connected: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`, ended: "통화 종료" };
  return <main className="fixed inset-0 z-[1000] flex flex-col bg-slate-950 text-white">
    <header className="relative z-10 flex items-center gap-4 px-5 py-4" style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}>
      <CallActionButton action="back" aria-label="통화에서 나가고 돌아가기" title="통화에서 나가고 돌아가기" onClick={() => { end.current(); router.push("/avatar"); }} />
      <div className="min-w-0 flex-1"><h1 className="truncate font-bold">{partner}</h1><p className="text-xs text-slate-400" role="status">{status[phase]}</p></div>
      {call && memberOf(call, uid || "")?.state === "joined" && phase !== "ended" && <CallActionButton action="invite" onClick={() => setShowInvite(true)} />}
    </header>
    <section className="relative flex-1 min-h-0 overflow-hidden mx-3 rounded-3xl bg-slate-900">
      {phase !== "ended" && tiles.map(m => <CallVideoTile key={m.uid} stream={m.uid === uid ? localStream : remoteStreams[m.uid] || null} name={m.name} local={m.uid === uid} cameraOff={m.uid === uid && cameraOff}
        large={m.uid === focused} smallIndex={small.findIndex(s => s.uid === m.uid)} onSelect={() => setLargeUid(m.uid)} />)}
      {(phase === "incoming" || phase === "ended" || phase === "loading") && <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 p-8 text-center text-slate-300">{status[phase]}</div>}
    </section>
    <footer className="shrink-0 px-5 pt-4 text-center" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
      {message && <p role="status" className="mb-4 text-sm text-amber-200">{message}</p>}
      {phase === "incoming" ? <div className="flex justify-center gap-8"><CallActionButton action="decline" onClick={() => end.current()} /><CallActionButton action="accept" aria-label="카메라 켜고 영상통화 받기" title="카메라 켜고 영상통화 받기" onClick={() => start.current()} /></div>
        : phase === "ended" ? <div className="flex justify-center"><CallActionButton action="back" onClick={() => router.push("/avatar")} /></div>
        : <div className="flex justify-center gap-3"><CallActionButton action="microphone" off={muted} disabled={!localStream} onClick={toggleMic} /><CallActionButton action="hangup" onClick={() => end.current()} /><CallActionButton action="camera" off={cameraOff} disabled={!localStream} onClick={toggleCamera} /></div>}
    </footer>
    {showInvite && call && phase !== "ended" && <InviteCallFriend call={call} client={clientId} onClose={() => setShowInvite(false)} />}
  </main>;
}
