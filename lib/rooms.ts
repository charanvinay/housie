/**
 * In-memory room store for Tambola.
 * Room code → room state. No persistence (resets on server restart).
 */

export type Player = {
  id: string;
  name: string;
  ticketCount: number;
  joinedAt: number;
};

export type Room = {
  code: string;
  ticketPrice: number;
  hostId: string;
  players: Player[];
  status: "waiting" | "started" | "ended";
  createdAt: number;
};

const rooms = new Map<string, Room>();

const ROOM_CODE_LENGTH = 6;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 12);
}

export function createRoom(
  ticketPrice: number,
  hostTicketCount: number = 0
): { room: Room; hostId: string } {
  const code = generateRoomCode();
  const hostId = generateId();
  const tickets = Math.min(6, Math.max(0, Math.floor(hostTicketCount) || 0));
  const room: Room = {
    code,
    ticketPrice,
    hostId,
    players: [{ id: hostId, name: "Host", ticketCount: tickets, joinedAt: Date.now() }],
    status: "waiting",
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  notifyRoomUpdated(code);
  return { room, hostId };
}

export function getRoom(code: string): Room | undefined {
  const room = rooms.get(code.toUpperCase());
  return room ? { ...room, players: [...room.players] } : undefined;
}

export function joinRoom(
  code: string,
  options: { playerName?: string; ticketCount: number }
): { room: Room; playerId: string } | { error: string } {
  const upperCode = code.toUpperCase().trim();
  const room = rooms.get(upperCode);
  if (!room) return { error: "Room not found" };
  if (room.status !== "waiting") return { error: "Game already started or ended" };

  const playerId = generateId();
  const name = (options.playerName || "Player").trim() || "Player";
  const ticketCount = Math.min(6, Math.max(1, Math.floor(options.ticketCount) || 1));

  room.players.push({
    id: playerId,
    name,
    ticketCount,
    joinedAt: Date.now(),
  });
  notifyRoomUpdated(upperCode);
  return {
    room: getRoom(upperCode)!,
    playerId,
  };
}

export function leaveRoom(
  code: string,
  playerId: string
): { ok: true } | { error: string } {
  const upperCode = code.toUpperCase();
  const room = rooms.get(upperCode);
  if (!room) return { error: "Room not found" };
  if (room.status !== "waiting") return { error: "Cannot leave after game has started" };
  if (room.hostId === playerId) return { error: "Host cannot leave this way; close the room or start the game" };

  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return { error: "Player not in room" };
  room.players.splice(idx, 1);
  notifyRoomUpdated(upperCode);
  return { ok: true };
}

export function endRoom(code: string, hostId: string): { ok: true } | { error: string } {
  const upperCode = code.toUpperCase();
  const room = rooms.get(upperCode);
  if (!room) return { error: "Room not found" };
  if (room.hostId !== hostId) return { error: "Only the host can end the game" };
  if (room.status === "ended") return { error: "Game already ended" };
  room.status = "ended";
  notifyRoomUpdated(upperCode);
  return { ok: true };
}

export function updatePlayerTickets(
  code: string,
  playerId: string,
  ticketCount: number
): Room | { error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: "Room not found" };
  if (room.status !== "waiting") return { error: "Cannot change tickets after game started" };

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { error: "Player not found" };

  player.ticketCount = Math.min(6, Math.max(0, Math.floor(ticketCount)));
  notifyRoomUpdated(room.code);
  return getRoom(room.code)!;
}

export function totalTickets(room: Room): number {
  return room.players.reduce((sum, p) => sum + p.ticketCount, 0);
}

export function totalAmount(room: Room): number {
  return totalTickets(room) * room.ticketPrice;
}

// --- Real-time: broadcast room updates to socket server (POST /broadcast) ---

const SOCKET_SERVER_URL =
  typeof process !== "undefined"
    ? process.env.SOCKET_SERVER_URL || "http://localhost:3001"
    : "http://localhost:3001";

function notifyRoomUpdated(code: string): void {
  const key = code.toUpperCase();
  const room = rooms.get(key);
  if (!room) return;
  const snapshot = getRoom(key)!;
  const payload = {
    ...snapshot,
    totalTickets: totalTickets(snapshot),
    totalAmount: totalAmount(snapshot),
  };
  fetch(`${SOCKET_SERVER_URL}/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: key, room: payload }),
  }).catch(() => {});
}
