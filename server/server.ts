// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// room 상태 메모리 (운영은 Redis 권장)
const rooms = {}; 
// rooms[roomId] = {
//   users: { userId: socketId },
//   speaker: userId|null,
//   speakerStart: timestamp|null
// }

io.on("connection", (socket) => {
  socket.on("join", ({ roomId, userId }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { users: {}, speaker: null, speakerStart: null };
    }

    rooms[roomId].users[userId] = socket.id;
    socket.join(roomId);
    socket.data = { roomId, userId };

    // 현재 방 상태 즉시 전달 (복구용)
    socket.emit("state", rooms[roomId]);

    socket.to(roomId).emit("user-joined", { userId });
  });

  socket.on("start-speaking", ({ roomId, userId }) => {
    rooms[roomId].speaker = userId;
    rooms[roomId].speakerStart = Date.now();
    io.to(roomId).emit("speaker", {
      userId,
      start: rooms[roomId].speakerStart,
    });
  });

  socket.on("stop-speaking", ({ roomId }) => {
    rooms[roomId].speaker = null;
    rooms[roomId].speakerStart = null;
    io.to(roomId).emit("speaker-stopped");
  });

  socket.on("disconnect", () => {
    const { roomId, userId } = socket.data || {};
    if (!roomId || !rooms[roomId]) return;

    delete rooms[roomId].users[userId];
    socket.to(roomId).emit("user-left", { userId });

    if (rooms[roomId].speaker === userId) {
      rooms[roomId].speaker = null;
      rooms[roomId].speakerStart = null;
      io.to(roomId).emit("speaker-stopped");
    }
  });
});

server.listen(4000, () => console.log("4000"));