"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type Chat = { user: string; msg: string };

export default function LivePage() {
  const roomId = "main"; // 단일 방
  const [nickname] = useState("user_" + Math.floor(Math.random() * 1000));
  const [queue, setQueue] = useState<string[]>([]);
  const [chat, setChat] = useState<Chat[]>([]);
  const [msg, setMsg] = useState("");
  const [isHandRaised, setIsHandRaised] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // ---------------- 소켓 연결 ----------------
 useEffect(() => {
  const socket = io("http://localhost:4000");
  socketRef.current = socket;

  // 이벤트 등록
  socket.on("chat-update", setChat);

  // cleanup 함수
  return () => {
    socket.disconnect(); // ✅ 여기서는 Socket 객체 반환하지 않음
  };
}, []);


  // ---------------- 로컬 비디오 ----------------
  useEffect(() => {
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
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

  // ---------------- 이벤트 ----------------
  const raiseHand = () => {
    socketRef.current?.emit("raise-hand", { roomId, user: nickname });
    setIsHandRaised(true);
  };

  const sendChat = () => {
    if (!msg) return;
    socketRef.current?.emit("send-chat", { roomId, user: nickname, msg });
    setMsg("");
  };

  const sendRating = (emoji: string) => {
    alert(`당신이 보낸 평가: ${emoji}`);
  };

  const currentSinger = queue[0];

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>🎤 온라인 노래방</h1>

      <button style={styles.handBtn} onClick={raiseHand}>
        {isHandRaised ? "✋ 노래 취소" : "✋ 손 들기"}
      </button>

      <div style={styles.videoContainer}>
        <video ref={localVideoRef} style={styles.video} muted />
        {currentSinger === nickname && <div style={styles.liveBadge}>🔴 LIVE</div>}
        <div style={styles.singIndicator}>
          {currentSinger === nickname ? "🎤 지금 노래 중!" : "🎶 노래 대기중"}
        </div>
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
          <button onClick={sendChat} style={styles.sendBtn}>전송</button>
        </div>

        <div style={styles.ratingBox}>
          {["😍", "🤩", "❤️"].map((e) => (
            <button key={e} onClick={() => sendRating(e)} style={styles.ratingBtn}>{e}</button>
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
    width: 440,
    boxShadow: "0 0 30px 10px #ff79b1, 0 0 60px 20px #ff4081",
    borderRadius: 16,
    transition: "box-shadow 0.3s ease-in-out",
  },
  video: {
    width: "100%",
    borderRadius: 12,
    border: "3px solid #ff79b1",
    filter: "brightness(1.1) contrast(1.2)",
  },
  liveBadge: {
    position: "absolute",
    top: 10,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 26,
    color: "red",
    fontWeight: "bold",
    textShadow: "0 0 10px #ff0000, 0 0 20px #ff79b1",
  },
  singIndicator: {
    marginTop: 12,
    fontSize: 22,
    color: "#ff79b1",
    textShadow: "0 0 8px #ff79b1",
    fontWeight: "bold",
  },
  chatArea: {
    marginTop: 25,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "70%",
  },
  chat: {
    background: "#111",
    padding: 16,
    borderRadius: 16,
    maxHeight: 220,
    overflowY: "auto",
    width: "100%",
    boxShadow: "0 0 20px 5px #ff79b1",
  },
  chatInput: {
    display: "flex",
    gap: 10,
    marginTop: 10,
    width: "100%",
  },
  chatInputField: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: 12,
    border: "2px solid #ff79b1",
    background: "#222",
    color: "#fff",
  },
  sendBtn: {
    padding: "10px 20px",
    borderRadius: 12,
    border: "none",
    background: "#ff4081",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 0 10px #ff79b1",
  },
  ratingBox: {
    display: "flex",
    gap: 30,
    justifyContent: "center",
    marginTop: 15,
  },
  ratingBtn: {
    fontSize: 36,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    transition: "0.2s",
  },
};
