"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type Chat = { user: string; msg: string };

export default function LivePage() {
  // ---------------- 닉네임 ----------------
  const [nickname, setNickname] = useState<string | null>(null);

useEffect(() => {
  let saved = localStorage.getItem("nickname");
  if (!saved) {
    saved = "user_" + Math.floor(Math.random() * 1000);
    localStorage.setItem("nickname", saved);
  }
  setNickname(saved);
}, []);


  // ---------------- 상태 ----------------
 const [chat, setChat] = useState<Chat[]>([]); // 초기값은 빈 배열
const [msg, setMsg] = useState("");

// 브라우저에서만 불러오기
useEffect(() => {
  const saved = localStorage.getItem("chat");
  if (saved) {
    setChat(JSON.parse(saved));
  }
}, []);

// chat이 바뀔 때마다 저장
useEffect(() => {
  localStorage.setItem("chat", JSON.stringify(chat));
}, [chat]);

  const [isHandRaised, setIsHandRaised] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // ---------------- 소켓 ----------------
 useEffect(() => {
  const socket = io("http://localhost:4000", { reconnection: true });
  socketRef.current = socket;

  socket.on("chat-update", setChat);

  // ❌ 절대 return socket 하지 마!
  // ✅ cleanup 함수만 return
  return () => {
    socket.disconnect();
  };
}, []);


  // ---------------- WebRTC ----------------
  useEffect(() => {
    const initLocalStream = async () => {
      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
          localVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error("WebRTC 초기화 실패:", err);
      }
    };
    initLocalStream();
  }, []);

  // ---------------- 이벤트 ----------------
  const raiseHand = () => setIsHandRaised(!isHandRaised);

  const sendChat = () => {
    if (!msg) return;
    const newChat = [...chat, { user: nickname, msg }];
    setChat(newChat);
    localStorage.setItem("chat", JSON.stringify(newChat)); // 로컬 저장
    socketRef.current?.emit("send-chat", { user: nickname, msg }); // 다른 사람에게도 보냄
    setMsg("");
  };

  const sendRating = (emoji: string) => {
    alert(`당신이 보낸 평가: ${emoji}`);
  };

  // ---------------- UI ----------------
  return (
    <div style={styles.page}>
      <div style={styles.bgLights}></div>

      {/* 손들기 버튼 */}
      <button style={styles.handBtn} onClick={raiseHand}>
        {isHandRaised ? "✋ 내 손 내림" : "✋ 손 들기"}
      </button>

      {/* 얼굴 화면 */}
      <div style={styles.videoContainer}>
        <video ref={localVideoRef} style={styles.video} muted />
        {isHandRaised && <div style={styles.liveBadge}>🔴 LIVE</div>}
        <div style={styles.singIndicator}>
          {isHandRaised ? "🎤 지금 노래 중!" : "🎶 노래 부르기!"}
        </div>
      </div>

      {/* 채팅 + 평가 */}
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
            className="bg-black"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            style={styles.input}
            placeholder="채팅 입력..."
          />
          <button style={styles.button} onClick={sendChat}>
            전송
          </button>
        </div>
        <div style={styles.ratingBox}>
          {["😍", "🤩", "❤️"].map((e) => (
            <button
              key={e}
              style={styles.ratingBtn}
              onClick={() => sendRating(e)}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- 스타일 (기존 유지) ----------------
const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#111",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "sans-serif",
    position: "relative",
    padding: 20,
    overflow: "hidden",
  },
  bgLights: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "radial-gradient(circle at top, #444 0%, #111 70%)",
    zIndex: -1,
    animation: "pulse 3s infinite alternate",
  },
  handBtn: {
    position: "absolute",
    top: 20,
    left: 20,
    padding: "12px 24px",
    fontSize: 18,
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(45deg,#ff4081,#ff79b1)",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(255,64,129,0.5)",
    zIndex: 1,
  },
  videoContainer: {
    marginTop: 40,
    textAlign: "center",
    position: "relative",
  },
  video: {
    width: 500,
    maxWidth: "90vw",
    borderRadius: 20,
    border: "5px solid #ff4081",
    boxShadow: "0 0 30px rgba(255,64,129,0.7)",
  },
  liveBadge: {
    position: "absolute",
    top: 10,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 24,
    fontWeight: "bold",
    color: "#ff0000",
    textShadow: "0 0 10px #ff0000, 0 0 20px #ff5555",
    animation: "pulseLive 1s infinite alternate",
  },
  singIndicator: {
    position: "absolute",
    bottom: -50,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 28,
    color: "#ff77b1",
    textShadow: "0 0 15px #ff77b1, 0 0 30px #ff4081",
  },
  chatArea: {
    position: "absolute",
    bottom: 20,
    width: "90%",
    maxWidth: 600,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  chat: {
    width: "100%",
    maxHeight: 250,
    overflowY: "auto",
    background: "rgba(0,0,0,0.6)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    boxShadow: "0 0 20px rgba(255,64,129,0.5)",
  },
  chatInput: { display: "flex", gap: 10, width: "100%", marginBottom: 10 },
  input: { flex: 1, padding: 10, borderRadius: 12, border: "1px solid #ccc" },
  button: {
    padding: "10px 16px",
    borderRadius: 12,
    background: "linear-gradient(45deg,#ff4081,#ff79b1)",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
  },
  ratingBox: { display: "flex", gap: 20, justifyContent: "center" },
  ratingBtn: {
    fontSize: 36,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
};

// ---------------- 애니메이션 ----------------
if (typeof window !== "undefined") {
  const styleEl = document.createElement("style");
  styleEl.innerHTML = `
    @keyframes pulse {
      0% { background-position: 0 0; }
      50% { background-position: 100% 100%; }
      100% { background-position: 0 0; }
    }
    @keyframes pulseLive {
      0% { transform: translateX(-50%) scale(1); }
      50% { transform: translateX(-50%) scale(1.1); }
      100% { transform: translateX(-50%) scale(1); }
    }
    button:hover { transform: scale(1.2); }
  `;
  document.head.appendChild(styleEl);
}
