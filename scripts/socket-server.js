/**
 * Socket.IO server for real-time room updates (port 3001 by default).
 * Run with: npm run socket
 * Run Next.js in another terminal: npm run dev
 * Both must be running for the app to work with live updates.
 */

const http = require("http");
const { Server } = require("socket.io");

const PORT = Number(process.env.SOCKET_PORT) || 3001;

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("join_room", (payload) => {
    const roomCode = payload?.roomCode || payload;
    if (roomCode && typeof roomCode === "string") {
      socket.join(roomCode.toUpperCase());
    }
  });

  socket.on("leave_room", (payload) => {
    const roomCode = payload?.roomCode || payload;
    if (roomCode && typeof roomCode === "string") {
      socket.leave(roomCode.toUpperCase());
    }
  });
});

server.on("request", (req, res) => {
  if (req.method !== "POST" || req.url !== "/broadcast") {
    return;
  }
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    try {
      const { code, room } = JSON.parse(body);
      if (code && room) {
        io.to(String(code).toUpperCase()).emit("room", room);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid body" }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Socket server on http://localhost:${PORT}`);
});
