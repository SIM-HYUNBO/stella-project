const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }, // 테스트용
});

io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);

  socket.on("offer", (data) => {
    socket.to(data.target).emit("offer", { sdp: data.sdp, from: socket.id });
  });

  socket.on("answer", (data) => {
    socket.to(data.target).emit("answer", { sdp: data.sdp, from: socket.id });
  });

  socket.on("ice-candidate", (data) => {
    socket.to(data.target).emit("ice-candidate", { candidate: data.candidate, from: socket.id });
  });

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("new-user", socket.id);
  });
});

server.listen(3001, () => console.log("Signaling server running on port 3001"));