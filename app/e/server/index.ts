import http from "http";
import { Server } from "socket.io";

const server = http.createServer();
const io = new Server(server, { cors: { origin: "*" } });

const rooms: any = {
  main: { queue: [], chat: [] } // 단일 방
};

io.on("connection", (socket) => {
  const roomId = "main";
  socket.join(roomId);

  // 손 들기
  socket.on("raise-hand", ({ user }) => {
    const room = rooms[roomId];
    if (!room.queue.includes(user)) room.queue.push(user);
    io.to(roomId).emit("queue-update", room.queue);
  });

  // 손 내리기
  socket.on("lower-hand", ({ user }) => {
    const room = rooms[roomId];
    room.queue = room.queue.filter((u: string) => u !== user);
    io.to(roomId).emit("queue-update", room.queue);
  });

  // 채팅
  socket.on("send-chat", ({ user, msg }) => {
    const room = rooms[roomId];
    const chat = { user, msg };
    room.chat.push(chat);
    io.to(roomId).emit("chat-update", room.chat);
  });

  // WebRTC signaling
  socket.on("offer", (d) => socket.to(d.to).emit("offer", d));
  socket.on("answer", (d) => socket.to(d.to).emit("answer", d));
  socket.on("ice", (d) => socket.to(d.to).emit("ice", d));
});

server.listen(4000, () => console.log("🔥 Socket Server running on 4000"));
