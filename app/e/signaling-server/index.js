const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });
let clients = [];

wss.on("connection", (ws) => {
  clients.push(ws);

  ws.on("message", (msg) => {
    clients.forEach((c) => {
      if (c !== ws && c.readyState === WebSocket.OPEN) {
        c.send(msg.toString());
      }
    });
  });

  ws.on("close", () => {
    clients = clients.filter((c) => c !== ws);
  });
});

console.log("🎤 Signaling server running on ws://localhost:8080");
