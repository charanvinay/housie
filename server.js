/**
 * Optional: single server (Next.js + Socket.IO on one port).
 * Default setup is two processes: npm run dev (Next.js) + npm run socket (Socket.IO on another port). See docs/REALTIME_FLOW.md.
 *
 * REAL-TIME FLOW (when using this server):
 * - Every request hits this server. We decide who handles it:
 *   1. POST /broadcast → we emit the room state to the Socket.IO room (used by API after any room change).
 *   2. /socket.io     → we do NOT respond; Socket.IO (added below) will handle it and respond.
 *   3. Everything else → Next.js (pages + API).
 *
 * - Host and players: they open /room/[code], connect to Socket.IO, join the room by code,
 *   and listen for the "room" event. Whenever we emit "room" to that Socket.IO room,
 *   everyone (host + all players) gets the update without refreshing.
 *
 * Run: npm run dev  (do NOT run "next dev" if you want real-time)
 */

const http = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const PORT = Number(process.env.PORT) || 3000;

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Request handler: we run first. For /socket.io we do nothing so Socket.IO can respond.
  const onRequest = (req, res) => {
    const pathname = req.url ? req.url.split("?")[0] : "";

    if (req.method === "POST" && pathname === "/broadcast") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
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
      return;
    }

    if (pathname === "/socket.io" || (req.url && String(req.url).startsWith("/socket.io"))) {
      return; // leave request for Socket.IO — do not call handle(), do not end response
    }

    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  };

  const server = http.createServer(onRequest);

  const io = new Server(server, {
    path: "/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // API routes (same process) call this to push room state to all clients in that room
  global.__SOCKET_IO_BROADCAST = (code, room) => {
    io.to(String(code).toUpperCase()).emit("room", room);
  };

  io.on("connection", (socket) => {
    socket.on("join_room", (payload) => {
      const roomCode = payload?.roomCode ?? payload;
      if (roomCode && typeof roomCode === "string") {
        socket.join(roomCode.toUpperCase());
      }
    });
    socket.on("leave_room", (payload) => {
      const roomCode = payload?.roomCode ?? payload;
      if (roomCode && typeof roomCode === "string") {
        socket.leave(roomCode.toUpperCase());
      }
    });
    socket.on("draw_started", (payload) => {
      const roomCode = payload?.roomCode ?? payload;
      if (roomCode && typeof roomCode === "string") {
        io.to(String(roomCode).toUpperCase()).emit("draw_started", {});
      }
    });
    socket.on("claim_made", (payload) => {
      const roomCode = payload?.roomCode ?? payload;
      const claimerId = payload?.claimerId;
      if (roomCode && typeof roomCode === "string") {
        io.to(String(roomCode).toUpperCase()).emit("claim_made", { claimerId });
      }
    });
  });

  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`Ready on http://localhost:${PORT} (Next.js + Socket.IO — real-time on)`);
  });
});
