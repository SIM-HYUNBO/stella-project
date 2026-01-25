// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

let chatLog = [];

// 연결
io.on("connection", (socket) => {
  console.log("🔥 New connection:", socket.id);

  socket.on("join", ({ nickname }) => {
    console.log(`${nickname} joined`);
    // 기존 채팅 보내기
    socket.emit("chat-update", chatLog);

    // 다른 사람에게 새 유저 알리기
    socket.broadcast.emit("user-joined", socket.id);
  });

  // 채팅
  socket.on("send-chat", (msg) => {
    chatLog.push(msg);
    io.emit("chat-update", chatLog); // 공용 채팅
  });

  // WebRTC 시그널링
  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", { from: socket.id, offer });
  });

  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", { answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", { candidate });
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
  });
});

server.listen(4000, () => console.log("Server running on http://localhost:4000"));
