/**
 * In-memory room store for Tambola.
 * Room code → room state. No persistence (resets on server restart).
 */

import type { Ticket } from "./ticket";
import { generateTickets } from "./ticket";

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
  /** Numbers drawn so far (after game starts). */
  drawnNumbers?: number[];
  /** Tickets per player (playerId -> tickets), set when game starts. */
  playerTickets?: Record<string, Ticket[]>;
  /** Each claim type is an array so multiple players can win with the same number; we store only the winning (last) number. */
  jaldiFiveClaimed?: { playerId: string; playerName: string; winningNumber: number }[];
  firstLineClaimed?: { playerId: string; playerName: string; winningNumber: number }[];
  middleLineClaimed?: { playerId: string; playerName: string; winningNumber: number }[];
  lastLineClaimed?: { playerId: string; playerName: string; winningNumber: number }[];
  housieClaimed?: { playerId: string; playerName: string; winningNumber: number }[];
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
  hostTicketCount: number = 0,
  hostName?: string
): { room: Room; hostId: string } {
  const code = generateRoomCode();
  const hostId = generateId();
  const tickets = Math.min(6, Math.max(0, Math.floor(hostTicketCount) || 0));
  const name = (hostName ?? "").trim() || "Host";
  const room: Room = {
    code,
    ticketPrice,
    hostId,
    players: [{ id: hostId, name, ticketCount: tickets, joinedAt: Date.now() }],
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

export function startGame(code: string, hostId: string): { ok: true } | { error: string } {
  const upperCode = code.toUpperCase();
  const room = rooms.get(upperCode);
  if (!room) return { error: "Room not found" };
  if (room.hostId !== hostId) return { error: "Only the host can start the game" };
  if (room.status !== "waiting") return { error: "Game already started or ended" };

  const playerTickets: Record<string, Ticket[]> = {};
  for (const p of room.players) {
    const count = Math.min(6, Math.max(0, p.ticketCount)) || 0;
    playerTickets[p.id] = count > 0 ? generateTickets(count) : [];
  }
  room.playerTickets = playerTickets;
  room.drawnNumbers = [];
  room.jaldiFiveClaimed = [];
  room.firstLineClaimed = [];
  room.middleLineClaimed = [];
  room.lastLineClaimed = [];
  room.housieClaimed = [];
  room.status = "started";
  notifyRoomUpdated(upperCode);
  return { ok: true };
}

/** Last number in drawn order that appears in the claim numbers (the number that completed the claim). */
function getWinningNumber(drawnNumbers: number[], claimNumbers: number[]): number {
  const set = new Set(claimNumbers);
  for (let i = drawnNumbers.length - 1; i >= 0; i--) {
    if (set.has(drawnNumbers[i]!)) return drawnNumbers[i]!;
  }
  return claimNumbers[0] ?? 0;
}

function getNumbersInRow(ticket: Ticket, rowIndex: number): number[] {
  const row = ticket[rowIndex];
  if (!row) return [];
  return row.filter((c): c is number => c !== null);
}

function getAllNumbers(ticket: Ticket): number[] {
  const out: number[] = [];
  for (let r = 0; r < ticket.length; r++) {
    for (let c = 0; c < ticket[r]!.length; c++) {
      const v = ticket[r]![c];
      if (v !== null) out.push(v);
    }
  }
  return out;
}

function validateTicketClaim(
  room: Room,
  playerId: string,
  ticketIndex: number,
  numbers: number[]
): { error: string } | { ticket: Ticket } {
  const tickets = room.playerTickets?.[playerId];
  if (!tickets) return { error: "Tickets not found" };
  const ticket = tickets[ticketIndex];
  if (!ticket) return { error: "Invalid ticket" };
  const drawnSet = new Set(room.drawnNumbers ?? []);
  const allInDrawn = numbers.every((n) => n >= 1 && n <= 90 && drawnSet.has(n));
  if (!allInDrawn) return { error: "Not all numbers have been drawn yet" };
  return { ticket };
}

export function claimFirstLine(
  code: string,
  playerId: string,
  playerName: string,
  ticketIndex: number
): { ok: true } | { error: string } {
  const upperCode = code.toUpperCase();
  const room = rooms.get(upperCode);
  if (!room) return { error: "Room not found" };
  if (room.status !== "started") return { error: "Game not in progress" };

  const tickets = room.playerTickets?.[playerId];
  if (!tickets || !tickets[ticketIndex]) return { error: "Invalid ticket" };
  const numbers = getNumbersInRow(tickets[ticketIndex]!, 0);
  if (numbers.length !== 5) return { error: "First line must have 5 numbers" };
  const check = validateTicketClaim(room, playerId, ticketIndex, numbers);
  if ("error" in check) return check;

  const drawn = room.drawnNumbers ?? [];
  const winningNumber = getWinningNumber(drawn, numbers);
  if (!room.firstLineClaimed) room.firstLineClaimed = [];
  room.firstLineClaimed.push({ playerId, playerName, winningNumber });
  notifyRoomUpdated(upperCode);
  return { ok: true };
}

export function claimMiddleLine(
  code: string,
  playerId: string,
  playerName: string,
  ticketIndex: number
): { ok: true } | { error: string } {
  const upperCode = code.toUpperCase();
  const room = rooms.get(upperCode);
  if (!room) return { error: "Room not found" };
  if (room.status !== "started") return { error: "Game not in progress" };

  const tickets = room.playerTickets?.[playerId];
  if (!tickets || !tickets[ticketIndex]) return { error: "Invalid ticket" };
  const numbers = getNumbersInRow(tickets[ticketIndex]!, 1);
  if (numbers.length !== 5) return { error: "Middle line must have 5 numbers" };
  const check = validateTicketClaim(room, playerId, ticketIndex, numbers);
  if ("error" in check) return check;

  const drawn = room.drawnNumbers ?? [];
  const winningNumber = getWinningNumber(drawn, numbers);
  if (!room.middleLineClaimed) room.middleLineClaimed = [];
  room.middleLineClaimed.push({ playerId, playerName, winningNumber });
  notifyRoomUpdated(upperCode);
  return { ok: true };
}

export function claimLastLine(
  code: string,
  playerId: string,
  playerName: string,
  ticketIndex: number
): { ok: true } | { error: string } {
  const upperCode = code.toUpperCase();
  const room = rooms.get(upperCode);
  if (!room) return { error: "Room not found" };
  if (room.status !== "started") return { error: "Game not in progress" };

  const tickets = room.playerTickets?.[playerId];
  if (!tickets || !tickets[ticketIndex]) return { error: "Invalid ticket" };
  const numbers = getNumbersInRow(tickets[ticketIndex]!, 2);
  if (numbers.length !== 5) return { error: "Last line must have 5 numbers" };
  const check = validateTicketClaim(room, playerId, ticketIndex, numbers);
  if ("error" in check) return check;

  const drawn = room.drawnNumbers ?? [];
  const winningNumber = getWinningNumber(drawn, numbers);
  if (!room.lastLineClaimed) room.lastLineClaimed = [];
  room.lastLineClaimed.push({ playerId, playerName, winningNumber });
  notifyRoomUpdated(upperCode);
  return { ok: true };
}

export function claimHousie(
  code: string,
  playerId: string,
  playerName: string,
  ticketIndex: number
): { ok: true } | { error: string } {
  const upperCode = code.toUpperCase();
  const room = rooms.get(upperCode);
  if (!room) return { error: "Room not found" };
  if (room.status !== "started") return { error: "Game not in progress" };

  const tickets = room.playerTickets?.[playerId];
  if (!tickets || !tickets[ticketIndex]) return { error: "Invalid ticket" };
  const numbers = getAllNumbers(tickets[ticketIndex]!);
  if (numbers.length !== 15) return { error: "Ticket must have 15 numbers" };
  const check = validateTicketClaim(room, playerId, ticketIndex, numbers);
  if ("error" in check) return check;

  const drawn = room.drawnNumbers ?? [];
  const winningNumber = getWinningNumber(drawn, numbers);
  if (!room.housieClaimed) room.housieClaimed = [];
  room.housieClaimed.push({ playerId, playerName, winningNumber });
  room.status = "ended";
  notifyRoomUpdated(upperCode);
  return { ok: true };
}

export type ClaimType = "jaldiFive" | "firstLine" | "middleLine" | "lastLine" | "housie";

/** Claim multiple types at once (e.g. last line + housie with one number). All validated and set in one go. */
export function claimMultiple(
  code: string,
  playerId: string,
  playerName: string,
  ticketIndex: number,
  claimTypes: ClaimType[],
  jaldiFiveNumbers?: number[]
): { ok: true } | { error: string } {
  const upperCode = code.toUpperCase();
  const room = rooms.get(upperCode);
  if (!room) return { error: "Room not found" };
  if (room.status !== "started") return { error: "Game not in progress" };

  const tickets = room.playerTickets?.[playerId];
  if (!tickets || !tickets[ticketIndex]) return { error: "Invalid ticket" };
  const ticket = tickets[ticketIndex]!;
  const drawnSet = new Set(room.drawnNumbers ?? []);

  const drawn = room.drawnNumbers ?? [];

  const toApply: ClaimType[] = [];
  if (claimTypes.includes("firstLine")) {
    const nums = getNumbersInRow(ticket, 0);
    if (nums.length === 5 && nums.every((n) => drawnSet.has(n))) toApply.push("firstLine");
  }
  if (claimTypes.includes("middleLine")) {
    const nums = getNumbersInRow(ticket, 1);
    if (nums.length === 5 && nums.every((n) => drawnSet.has(n))) toApply.push("middleLine");
  }
  if (claimTypes.includes("lastLine")) {
    const nums = getNumbersInRow(ticket, 2);
    if (nums.length === 5 && nums.every((n) => drawnSet.has(n))) toApply.push("lastLine");
  }
  if (claimTypes.includes("jaldiFive") && jaldiFiveNumbers?.length === 5) {
    if (jaldiFiveNumbers.every((n) => drawnSet.has(n))) toApply.push("jaldiFive");
  }
  if (claimTypes.includes("housie")) {
    const nums = getAllNumbers(ticket);
    if (nums.length === 15 && nums.every((n) => drawnSet.has(n))) toApply.push("housie");
  }

  if (toApply.length === 0) return { error: "No valid claims" };

  for (const t of toApply) {
    if (t === "firstLine") {
      const nums = getNumbersInRow(ticket, 0);
      if (!room.firstLineClaimed) room.firstLineClaimed = [];
      room.firstLineClaimed.push({ playerId, playerName, winningNumber: getWinningNumber(drawn, nums) });
    } else if (t === "middleLine") {
      const nums = getNumbersInRow(ticket, 1);
      if (!room.middleLineClaimed) room.middleLineClaimed = [];
      room.middleLineClaimed.push({ playerId, playerName, winningNumber: getWinningNumber(drawn, nums) });
    } else if (t === "lastLine") {
      const nums = getNumbersInRow(ticket, 2);
      if (!room.lastLineClaimed) room.lastLineClaimed = [];
      room.lastLineClaimed.push({ playerId, playerName, winningNumber: getWinningNumber(drawn, nums) });
    } else if (t === "jaldiFive" && jaldiFiveNumbers) {
      if (!room.jaldiFiveClaimed) room.jaldiFiveClaimed = [];
      room.jaldiFiveClaimed.push({ playerId, playerName, winningNumber: getWinningNumber(drawn, jaldiFiveNumbers) });
    } else if (t === "housie") {
      const nums = getAllNumbers(ticket);
      if (!room.housieClaimed) room.housieClaimed = [];
      room.housieClaimed.push({ playerId, playerName, winningNumber: getWinningNumber(drawn, nums) });
      room.status = "ended";
    }
  }
  notifyRoomUpdated(upperCode);
  return { ok: true };
}

export function drawNumber(code: string, hostId: string): { number: number } | { error: string } {
  const upperCode = code.toUpperCase();
  const room = rooms.get(upperCode);
  if (!room) return { error: "Room not found" };
  if (room.hostId !== hostId) return { error: "Only the host can draw numbers" };
  if (room.status !== "started") return { error: "Game not in progress" };

  const drawn = room.drawnNumbers ?? [];
  if (drawn.length >= 90) return { error: "All numbers already drawn" };
  const available = Array.from({ length: 90 }, (_, i) => i + 1).filter((n) => !drawn.includes(n));
  const next = available[Math.floor(Math.random() * available.length)]!;
  room.drawnNumbers = [...drawn, next];
  notifyRoomUpdated(upperCode);
  return { number: next };
}

export function claimJaldiFive(
  code: string,
  playerId: string,
  playerName: string,
  numbers: number[]
): { ok: true } | { error: string } {
  const upperCode = code.toUpperCase();
  const room = rooms.get(upperCode);
  if (!room) return { error: "Room not found" };
  if (room.status !== "started") return { error: "Game not in progress" };
  if (!Array.isArray(numbers) || numbers.length !== 5) {
    return { error: "Exactly 5 numbers required" };
  }

  const drawn = room.drawnNumbers ?? [];
  const drawnSet = new Set(drawn);
  const allInDrawn = numbers.every((n) => typeof n === "number" && n >= 1 && n <= 90 && drawnSet.has(n));
  if (!allInDrawn) {
    return { error: "Selected numbers are not all in the drawn list" };
  }

  const winningNumber = getWinningNumber(drawn, numbers);
  if (!room.jaldiFiveClaimed) room.jaldiFiveClaimed = [];
  room.jaldiFiveClaimed.push({ playerId, playerName, winningNumber });
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

/** Prize pool per claim type: 20% Jaldi Five, 15% each line, 35% Housie. Multiples of 5; for small pools uses multiples of 2 so no claim is 0 and total is within pool. */
export function getClaimPrizeAmounts(totalAmount: number): {
  jaldiFive: number;
  firstLine: number;
  middleLine: number;
  lastLine: number;
  housie: number;
} {
  const t = Math.max(0, totalAmount);
  const roundTo = (x: number, mult: number) => Math.round(x / mult) * mult;
  const minAmount = (v: number, min: number) => Math.max(min, v);

  function withStep(step: number, min: number) {
    let j = roundTo(t * 0.2, step);
    let f = roundTo(t * 0.15, step);
    let m = roundTo(t * 0.15, step);
    let l = roundTo(t * 0.15, step);
    let h = roundTo(t * 0.35, step);
    const sum = j + f + m + l + h;
    const diff = t - sum;
    if (diff !== 0) h = roundTo(h + diff, step);
    j = minAmount(j, min);
    f = minAmount(f, min);
    m = minAmount(m, min);
    l = minAmount(l, min);
    h = minAmount(h, min);
    return { jaldiFive: j, firstLine: f, middleLine: m, lastLine: l, housie: h };
  }

  const with5 = withStep(5, 5);
  const sum5 = with5.jaldiFive + with5.firstLine + with5.middleLine + with5.lastLine + with5.housie;
  if (sum5 <= t) return with5;
  return withStep(2, 2);
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
