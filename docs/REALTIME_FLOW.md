# Real-time flow (Socket.IO)

Host and all players see updates **without refreshing**. The app uses **two processes and two ports**.

## Two ports, two commands

- **Next.js** (pages + API) on port **3000**  
  Run: **`npm run dev`**

- **Socket server** (Socket.IO) on port **3001**  
  Run: **`npm run socket`**

Run **both** in separate terminals. If the socket server is not running, the app still loads but the **Live** badge won’t turn on and you won’t get real-time updates.

Optional: set in `.env` (see `.env.example`):

- `SOCKET_PORT=3001` – socket server port  
- `SOCKET_SERVER_URL=http://localhost:3001` – used by the API to send broadcasts  
- `NEXT_PUBLIC_SOCKET_URL=http://localhost:3001` – used by the browser to connect to Socket.IO  

## When someone opens the room page (host or player)

1. The page loads and fetches the current room once from the API (`GET /api/rooms/[code]` on port 3000).
2. The page opens a **Socket.IO** connection to the socket server (e.g. `http://localhost:3001`).
3. On connect, the client sends **`join_room`** with the **room code** (e.g. `ABC123`).
4. The socket server adds that socket to the Socket.IO room with that code.
5. The page listens for the **`room`** event and updates the UI with `setRoom(data)`.

So: **everyone in the room (host + all players) is in the same Socket.IO room and listens for `room`.**

The room page uses **one Socket.IO connection per page**: it connects in a `useEffect` tied to the room code, joins the room on connect (and on reconnect), and cleans up on unmount. A **Live** badge shows when the socket is connected.

## When the room state changes (e.g. someone joins)

1. The client calls the API (e.g. `POST /api/rooms/ABC123` to join) on port 3000.
2. The API updates the in-memory room and calls **`notifyRoomUpdated(code)`**.
3. `notifyRoomUpdated` **POSTs** the new room state to the socket server at **`SOCKET_SERVER_URL/broadcast`** (port 3001).
4. The socket server does **`io.to(roomCode).emit("room", roomState)`**.
5. **Every client** in that Socket.IO room receives the **`room`** event and updates the UI.

So: **one source of truth (room store) → POST to socket server → broadcast → everyone gets the same update.**

## Summary

| Who / What        | Does what |
|-------------------|-----------|
| **Room page**     | Connects to socket server (3001), joins room by code, listens for `room`, updates UI. |
| **API**           | Updates room store, then `notifyRoomUpdated(code)` → POST to socket server `/broadcast`. |
| **Socket server** | Listens on 3001; handles Socket.IO and `POST /broadcast`; emits `room` to the right Socket.IO room. |

Result: **host and all players get the same real-time updates without refreshing.**
