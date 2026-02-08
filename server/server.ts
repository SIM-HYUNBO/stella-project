// server.js
import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: "*" } });

const rooms = {}; // 방별 참여자 관리

io.on("connection", (socket) => {
  console.log("사용자 접속:", socket.id);

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);
    // 방 참여자에게 기존 참여자 목록 전달
    const otherPeers = rooms[roomId].filter((id) => id !== socket.id);
    socket.emit("allUsers", otherPeers);
  });

  socket.on("offer", (payload) => {
    io.to(payload.target).emit("offer", { sdp: payload.sdp, caller: payload.caller });
  });

  socket.on("answer", (payload) => {
    io.to(payload.target).emit("answer", { sdp: payload.sdp, caller: payload.caller });
  });

  socket.on("ice-candidate", (payload) => {
    io.to(payload.target).emit("ice-candidate", payload.candidate);
  });

  // 채팅/찬반
  socket.on("newComment", ({ roomId, comment }) => {
    io.to(roomId).emit("updateComments", comment);
  });

  socket.on("disconnect", () => {
    console.log("사용자 나감:", socket.id);
    // 방에서 제거
    for (let roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
    }
  });
});

httpServer.listen(3001, () => console.log("Socket.IO + WebRTC signaling 서버 3001 포트 실행"));