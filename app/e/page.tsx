"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type Chat = { user: string; msg: string };
type PeerConnections = { [key: string]: RTCPeerConnection };

export default function LiveKaraoke() {
  const [nickname] = useState("user_" + Math.floor(Math.random() * 1000));
  const [queue, setQueue] = useState<string[]>([]);
  const [chat, setChat] = useState<Chat[]>([]);
  const [msg, setMsg] = useState("");
  const [isHandRaised, setIsHandRaised] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<PeerConnections>({});

  const roomId = "main";

  // ---------------- Socket 연결 ----------------
  useEffect(() => {
    const socket = io("http://localhost:4000");
    socketRef.current = socket;

    socket.on("queue-update", setQueue);
    socket.on("chat-update", setChat);

    socket.on("offer", async ({ from, sdp }) => {
      if (peersRef.current[from]) return;
      const pc = createPeerConnection(from);
      peersRef.current[from] = pc;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
      }
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { to: from, sdp: answer });
    });

    socket.on("answer", async ({ from, sdp }) => {
      const pc = peersRef.current[from];
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on("ice", ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (!pc) return;
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socket.disconnect();
      Object.values(peersRef.current).forEach((pc) => pc.close());
    };
  }, [nickname]);

  // ---------------- 로컬 비디오 ----------------
  useEffect(() => {
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error("WebRTC 실패:", err);
      }
    };
    initLocalStream();
  }, []);

  // ---------------- WebRTC Helper ----------------
  const createPeerConnection = (userId: string) => {
    const pc = new RTCPeerConnection();
    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit("ice", { to: userId, candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      if (!remoteVideoRefs.current[userId]) return;
      remoteVideoRefs.current[userId]!.srcObject = e.streams[0];
      remoteVideoRefs.current[userId]!.play().catch(() => {});
    };
    return pc;
  };

  // ---------------- 이벤트 ----------------
  const raiseHand = () => {
    if (!socketRef.current) return;

    if (!isHandRaised) {
      socketRef.current.emit("raise-hand", { roomId, user: nickname });
      setIsHandRaised(true);
    } else {
      socketRef.current.emit("lower-hand", { roomId, user: nickname });
      setIsHandRaised(false);
    }
  };

  const sendChat = () => {
    if (!msg) return;
    socketRef.current?.emit("send-chat", { roomId, user: nickname, msg });
    setMsg("");
  };

  const sendRating = (emoji: string) => alert(`평가: ${emoji}`);

  const currentSinger = queue[0];

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>🎤 온라인 노래방</h1>

      <button style={styles.handBtn} onClick={raiseHand}>
        {isHandRaised ? "✋ 노래 취소" : "✋ 손 들기"}
      </button>

      <div style={styles.videoContainer}>
        <video ref={localVideoRef} style={styles.video} muted />
        {queue.map((user) =>
          user === nickname ? null : (
            <video
              key={user}
              ref={(el) => { remoteVideoRefs.current[user] = el ?? null }}
              style={styles.remoteVideo}
              autoPlay
              playsInline
            />
          )
        )}
        {currentSinger && <div style={styles.liveBadge}>🔴 LIVE: {currentSinger}</div>}
      </div>

      <div style={styles.chatArea}>
        <div style={styles.chat}>
          {chat.map((c, i) => (
            <div key={i}>
              <b>{c.user}</b>: {c.msg}
            </div>
          ))}
        </div>

        <div style={styles.chatInput}>
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="채팅 입력..."
            style={styles.chatInputField}
          />
          <button type="button" onClick={sendChat} style={styles.sendBtn}>
            전송
          </button>
        </div>

        <div style={styles.ratingBox}>
          {["😍", "🤩", "❤️"].map((e) => (
            <button key={e} onClick={() => sendRating(e)} style={styles.ratingBtn}>
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- 스타일 ----------------
const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#111",
    color: "#fff",
    fontFamily: "sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: 20,
  },
  title: { fontSize: 36, color: "#ff79b1", textShadow: "0 0 10px #ff4081" },
  handBtn: {
    padding: "12px 30px",
    fontSize: 20,
    borderRadius: 12,
    background: "#ff4081",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    marginTop: 15,
    boxShadow: "0 0 20px #ff79b1, 0 0 40px #ff4081",
    transition: "0.3s",
  },
  videoContainer: {
    marginTop: 25,
    textAlign: "center",
    position: "relative",
    width: "100%",
    maxWidth: 440,
    boxShadow: "0 0 30px 10px #ff79b1, 0 0 60px 20px #ff4081",
    borderRadius: 16,
  },
  video: { width: "100%", borderRadius: 12, border: "3px solid #ff79b1", filter: "brightness(1.1) contrast(1.2)" },
  remoteVideo: { width: "100%", borderRadius: 12, marginTop: 10, border: "2px solid #ff79b1" },
  liveBadge: {
    position: "absolute",
    top: 10,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 24,
    color: "red",
    fontWeight: "bold",
    textShadow: "0 0 10px #ff0000, 0 0 20px #ff79b1",
  },
  chatArea: { marginTop: 25, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 440 },
  chat: { background: "#111", padding: 16, borderRadius: 16, maxHeight: 220, overflowY: "auto", width: "100%", boxShadow: "0 0 20px 5px #ff79b1" },
  chatInput: { display: "flex", width: "100%", gap: 10, marginTop: 10 },
  chatInputField: { flex: 1, padding: "10px", borderRadius: 12, border: "2px solid #ff79b1", background: "#222", color: "#fff" },
  sendBtn: { padding: "10px 16px", borderRadius: 12, border: "none", background: "#ff4081", color: "#fff", cursor: "pointer", boxShadow: "0 0 10px #ff79b1" },
  ratingBox: { display: "flex", gap: 30, justifyContent: "center", marginTop: 15 },
  ratingBtn: { fontSize: 36, background: "transparent", border: "none", cursor: "pointer", transition: "0.2s" },
};
