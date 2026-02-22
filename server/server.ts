const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("user connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("offer", ({ offer, to }) => {
    socket.to(to).emit("offer", {
      offer,
      from: socket.id,
    });
  });

  socket.on("answer", ({ answer, to }) => {
    socket.to(to).emit("answer", {
      answer,
      from: socket.id,
    });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    socket.to(to).emit("ice-candidate", {
      candidate,
      from: socket.id,
    });
  });

  socket.on("chat-message", ({ message, roomId }) => {
    io.to(roomId).emit("chat-message", message);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("server running on 5000");
});