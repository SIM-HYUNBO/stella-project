"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/app/firebase";
import { callRequest, mediaError, waitForIce } from "@/lib/video-call-client";
import { validCallId, type VideoCall } from "@/lib/video-call";
import CallActionButton from "@/components/CallActionButton";

type Phase = "loading" | "incoming" | "preparing" | "ringing" | "connecting" | "connected" | "ended";
export default function VideoCallPage() {
  const params = useParams<{ callId: string }>();
  const id = params.callId;
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [call, setCall] = useState<VideoCall | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState("");
  const [muted, setMuted] = useState(false), [cameraOff, setCameraOff] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const localVideo = useRef<HTMLVideoElement>(null), remoteVideo = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const start = useRef<() => void>(() => {}), end = useRef<() => void>(() => {});

  useEffect(() => onAuthStateChanged(auth, user => {
    setUid(user?.uid || null);
    if (!user) { setMessage("로그인한 뒤 다시 통화에 들어와 줘."); setPhase("ended"); }
  }), []);

  useEffect(() => {
    if (!uid) return;
    if (!validCallId(id)) { setMessage("잘못된 통화 주소야."); setPhase("ended"); return; }
    let disposed = false, terminal = false, busy = false, attempted = false, ownsMedia = false;
    let pc: RTCPeerConnection | null = null, current: VideoCall | null = null;
    let iceServers: RTCIceServer[] = [], relayConfigured = false;
    let pollTimer: ReturnType<typeof setTimeout>, connectionTimer: ReturnType<typeof setTimeout>, disconnectedTimer: ReturnType<typeof setTimeout>;
    let lastSuccess = Date.now();
    const client = crypto.randomUUID();
    setCall(null); setMessage(""); setPhase("loading"); setMuted(false); setCameraOff(false); setSeconds(0);
    const release = () => {
      clearTimeout(connectionTimer); clearTimeout(disconnectedTimer);
      if (pc) { pc.ontrack = null; pc.onconnectionstatechange = null; pc.close(); pc = null; }
      stream.current?.getTracks().forEach(track => { track.onended = null; track.stop(); });
      stream.current = null;
      if (localVideo.current) localVideo.current.srcObject = null;
      if (remoteVideo.current) remoteVideo.current.srcObject = null;
    };
    const notifyEnd = () => callRequest("", { action: "end", id, client }, true).catch(() => {});
    const finish = (text: string, notify: boolean) => {
      if (terminal) return;
      terminal = true; release(); clearTimeout(pollTimer);
      if (!disposed) { setMessage(text); setPhase("ended"); }
      if (notify) void notifyEnd();
    };
    end.current = () => finish("통화가 종료됐어.", !!current);
    const begin = async () => {
      if (busy || terminal || disposed || !current) return;
      const outgoing = current.fromUid === uid;
      const owner = outgoing ? current.fromClient : current.toClient;
      if (owner && owner !== client) { finish("다른 창에서 이미 통화 중이야. 그 창으로 돌아가 줘.", false); return; }
      if (!outgoing && !current.offer) { setMessage("상대가 카메라를 준비하고 있어. 잠시 후 받아 줘."); return; }
      attempted = true; busy = true; setPhase("preparing"); setMessage("");
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error("HTTPS 주소의 최신 브라우저에서 다시 열어 줘.");
        const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
        if (disposed || terminal) { media.getTracks().forEach(track => track.stop()); return; }
        stream.current = media;
        if (localVideo.current) { localVideo.current.srcObject = media; void localVideo.current.play().catch(() => {}); }
        media.getTracks().forEach(track => { track.onended = () => finish("카메라나 마이크 연결이 끊어졌어.", true); });
        const peer = new RTCPeerConnection({ iceServers }); pc = peer;
        media.getTracks().forEach(track => peer.addTrack(track, media));
        peer.ontrack = event => {
          if (!remoteVideo.current) return;
          remoteVideo.current.srcObject = event.streams[0] || new MediaStream([event.track]);
          void remoteVideo.current.play().then(() => setAutoplayBlocked(false)).catch(() => setAutoplayBlocked(true));
        };
        peer.onconnectionstatechange = () => {
          if (disposed || terminal) return;
          if (peer.connectionState === "connected") {
            clearTimeout(connectionTimer); clearTimeout(disconnectedTimer);
            setPhase("connected"); setMessage("");
          } else if (peer.connectionState === "failed") finish(relayConfigured ? "연결하지 못했어. 네트워크를 확인하고 다시 걸어 줘." : "이 네트워크에서는 직접 연결이 어려워. 다른 와이파이에서 다시 걸어 줘.", true);
          else if (peer.connectionState === "disconnected") {
            setMessage("연결이 잠깐 끊어졌어. 다시 연결 중…");
            clearTimeout(disconnectedTimer);
            disconnectedTimer = setTimeout(() => finish("연결이 끊어져 통화를 종료했어.", true), 15000);
          }
        };
        if (outgoing) await peer.setLocalDescription(await peer.createOffer());
        else {
          await peer.setRemoteDescription(current.offer!);
          await peer.setLocalDescription(await peer.createAnswer());
        }
        await waitForIce(peer);
        if (disposed || terminal) return;
        await callRequest("", { action: outgoing ? "offer" : "answer", id, client, description: peer.localDescription!.toJSON() });
        ownsMedia = true;
        if (disposed || terminal) { void notifyEnd(); return; }
        setPhase(peer.connectionState === "connected" ? "connected" : outgoing ? "ringing" : "connecting");
        if (!outgoing && peer.connectionState !== "connected") connectionTimer = setTimeout(() => finish("연결 시간이 초과됐어. 네트워크를 바꿔 다시 걸어 줘.", true), 30000);
      } catch (e) { if (!disposed && !terminal) finish(mediaError(e), true); }
      finally { busy = false; }
    };
    start.current = () => { void begin(); };
    const poll = async () => {
      try {
        const result = await callRequest(`?id=${encodeURIComponent(id)}&client=${client}`);
        if (disposed || terminal) return;
        lastSuccess = Date.now();
        current = result.call || null; setCall(current);
        iceServers = result.iceServers || []; relayConfigured = result.relayConfigured === true;
        if (!current) { finish("통화를 찾지 못했어.", false); return; }
        if (current.status === "ended") {
          finish(current.reason === "declined" ? "상대가 전화를 받지 않았어." : current.reason === "timeout" ? "응답이 없어 통화가 종료됐어." : "통화가 종료됐어.", false); return;
        }
        const outgoing = current.fromUid === uid;
        if (!attempted) {
          if (outgoing) void begin();
          else if (current.toClient) { finish("다른 창에서 이미 통화 중이야. 그 창으로 돌아가 줘.", false); return; }
          else setPhase("incoming");
        }
        if (pc && outgoing && current.answer && !pc.remoteDescription && !busy) {
          setPhase("connecting");
          await pc.setRemoteDescription(current.answer);
          if (disposed || terminal) return;
          connectionTimer = setTimeout(() => { if (pc?.connectionState !== "connected") finish("연결 시간이 초과됐어. 네트워크를 바꿔 다시 걸어 줘.", true); }, 30000);
        }
      } catch (e) {
        if (!disposed && !terminal) {
          if (!current || Date.now() - lastSuccess > 20000) finish(mediaError(e), ownsMedia);
          else setMessage("통화 상태를 확인하고 있어…");
        }
      }
      if (!disposed && !terminal) pollTimer = setTimeout(poll, 2000);
    };
    const leave = () => finish("통화가 종료됐어.", ownsMedia || attempted);
    window.addEventListener("pagehide", leave);
    void poll();
    return () => {
      disposed = true;
      window.removeEventListener("pagehide", leave);
      clearTimeout(pollTimer); release();
      if (!terminal && (ownsMedia || attempted)) void notifyEnd();
      terminal = true;
      start.current = () => {}; end.current = () => {};
    };
  }, [id, uid]);

  useEffect(() => {
    if (phase !== "connected") return;
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);
  const toggleMic = () => { stream.current?.getAudioTracks().forEach(t => { t.enabled = muted; }); setMuted(!muted); };
  const toggleCamera = () => { stream.current?.getVideoTracks().forEach(t => { t.enabled = cameraOff; }); setCameraOff(!cameraOff); };
  const partner = call ? (uid === call.fromUid ? call.toName : call.fromName) : "영상통화";
  const status: Record<Phase, string> = { loading: "통화 확인 중…", incoming: "영상통화가 왔어", preparing: "카메라와 마이크 준비 중…", ringing: "상대가 받기를 기다리고 있어", connecting: "연결 중…", connected: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`, ended: "통화 종료" };
  return <main className="fixed inset-0 z-[1000] flex flex-col bg-slate-950 text-white">
    <header className="relative z-10 flex items-center gap-4 px-5 py-4" style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}>
      <CallActionButton action="back" aria-label="통화 종료하고 돌아가기" title="통화 종료하고 돌아가기" onClick={() => { end.current(); router.push("/avatar"); }} />
      <div><h1 className="font-bold">{partner}</h1><p className="text-xs text-slate-400" role="status">{status[phase]}</p></div>
    </header>
    <section className="relative flex-1 min-h-0 overflow-hidden mx-3 rounded-3xl bg-slate-900">
      <video ref={remoteVideo} autoPlay playsInline className={`h-full w-full object-contain ${phase === "connected" ? "" : "opacity-0"}`} aria-label="상대방 영상" />
      {phase !== "connected" && <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8 text-center"><div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-400 to-indigo-400 flex items-center justify-center text-4xl font-bold">{partner.slice(0, 1)}</div><p className="text-slate-300">{status[phase]}</p></div>}
      <div className="absolute top-4 right-4 w-28 sm:w-40 aspect-[3/4] rounded-2xl overflow-hidden border border-white/20 bg-slate-800 shadow-lg">
        <video ref={localVideo} autoPlay muted playsInline aria-label="내 영상" className={`w-full h-full object-cover -scale-x-100 ${cameraOff ? "invisible" : ""}`} />
        {cameraOff && <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-300">카메라 꺼짐</span>}
      </div>
      {autoplayBlocked && <CallActionButton action="sound" onClick={() => { void remoteVideo.current?.play().then(() => setAutoplayBlocked(false)).catch(() => setMessage("소리를 재생하지 못했어. 브라우저의 소리 허용 설정을 확인해 줘.")); }} className="absolute bottom-4 left-1/2 -translate-x-1/2" />}
    </section>
    <footer className="shrink-0 px-5 pt-4 text-center" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
      {message && <p role="status" className="mb-4 text-sm text-amber-200">{message}</p>}
      {phase === "incoming" ? <div className="flex justify-center gap-8"><CallActionButton action="decline" onClick={() => end.current()} /><CallActionButton action="accept" aria-label="카메라 켜고 영상통화 받기" title="카메라 켜고 영상통화 받기" onClick={() => start.current()} /></div>
        : phase === "ended" ? <div className="flex justify-center"><CallActionButton action="back" onClick={() => router.push("/avatar")} /></div>
        : <div className="flex justify-center gap-3">
          <CallActionButton action="microphone" off={muted} disabled={!stream.current} onClick={toggleMic} />
          <CallActionButton action="hangup" onClick={() => end.current()} />
          <CallActionButton action="camera" off={cameraOff} disabled={!stream.current} onClick={toggleCamera} />
        </div>}
    </footer>
  </main>;
}
