const io = require("socket.io")(3001, {
  cors: { origin: "*" },
});

const rooms = {};

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ roomId, nickname, side }) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ id: socket.id, nickname, side });

    // 기존 유저 목록
    socket.emit(
      "allUsers",
      rooms[roomId].filter((u) => u.id !== socket.id)
    );

    // 새 유저 알림
    socket.to(roomId).emit("newUser", {
      id: socket.id,
      nickname,
      side,
    });

    socket.on("offer", (data) =>
      io.to(data.target).emit("offer", data)
    );
    socket.on("answer", (data) =>
      io.to(data.target).emit("answer", data)
    );
    socket.on("ice-candidate", (data) =>
      io.to(data.target).emit("ice-candidate", data)
    );

    socket.on("disconnect", () => {
      rooms[roomId] = rooms[roomId]?.filter(
        (u) => u.id !== socket.id
      );
      socket.to(roomId).emit("userLeft", { id: socket.id });
    });
  });
});