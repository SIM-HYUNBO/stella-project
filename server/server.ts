// server.ts
import { Server } from "socket.io";

const io = new Server(4000, {
  cors: { origin: "*" },
});

const chats: { user: string; msg: string }[] = [];

io.on("connection", (socket) => {
  console.log("🔥 New connection");

  // 기존 채팅 보내기
  socket.on("send-chat", (data: { user: string; msg: string }) => {
    chats.push(data);
    io.emit("chat-update", chats); // 모든 클라이언트에 broadcast
  });

  // 연결 해제
  socket.on("disconnect", () => {
    console.log("❌ Disconnected");
  });
});

console.log("Socket.IO server running on :4000");
