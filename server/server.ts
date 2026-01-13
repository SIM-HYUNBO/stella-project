import http from "http";
import { Server } from "socket.io";

const server = http.createServer();
const io = new Server(server, { cors: { origin: "*" } });

interface Chat { user: string; msg: string; }
const chatHistory: Chat[] = [];

io.on("connection", (socket) => {
  console.log("🔥 New connection", socket.id);

  // 채팅
  socket.on("send-chat", (data: Chat) => {
    chatHistory.push(data);
    io.emit("chat-update", chatHistory);
  });

  // WebRTC 신호
  socket.on("offer", (data) => socket.to(data.to).emit("offer", data));
  socket.on("answer", (data) => socket.to(data.to).emit("answer", data));
  socket.on("ice", (data) => socket.to(data.to).emit("ice", data));

  socket.on("disconnect", () => console.log("❌ Disconnected", socket.id));
});

server.listen(4000, () => console.log("🔥 Socket.IO server running on :4000"));
