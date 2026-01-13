import http from "http";
import { Server } from "socket.io";
import crypto from "crypto";

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" },
});

type Room = {
  id: string;
  title: string;
  owner: string;
  users: string[];
  queue: string[];
  chat: { user: string; msg: string }[];
};

const rooms: Record<string, Room> = {};

io.on("connection", (socket) => {
  console.log("🔥 연결:", socket.id);

  socket.on("get-rooms", () => {
    socket.emit("rooms", Object.values(rooms));
  });

  socket.on("create-room", ({ title, user }) => {
    const id = crypto.randomUUID();
    rooms[id] = {
      id,
      title,
      owner: user,
      users: [user],
      queue: [],
      chat: [],
    };
    io.emit("rooms", Object.values(rooms));
  });

  socket.on("join-room", ({ roomId, user }) => {
    const room = rooms[roomId];
    if (!room) return;

    socket.join(roomId);
    if (!room.users.includes(user)) room.users.push(user);

    io.to(roomId).emit("room-update", room);
  });

  socket.on("raise-hand", ({ roomId, user }) => {
    const room = rooms[roomId];
    if (!room.queue.includes(user)) {
      room.queue.push(user);
      io.to(roomId).emit("queue-update", room.queue);
    }
  });

  socket.on("send-chat", ({ roomId, user, msg }) => {
    const room = rooms[roomId];
    room.chat.push({ user, msg });
    io.to(roomId).emit("chat-update", room.chat);
  });

  // WebRTC signaling (라이브용)
  socket.on("offer", (d) => socket.to(d.roomId).emit("offer", d));
  socket.on("answer", (d) => socket.to(d.roomId).emit("answer", d));
  socket.on("ice", (d) => socket.to(d.roomId).emit("ice", d));
});

server.listen(4000, () => {
  console.log("🔥 socket server 4000");
});
