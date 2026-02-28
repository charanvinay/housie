import type { ClaimEntry, TicketGrid } from "./types";

export const ROOM_SESSION_KEY = "housie_room";
const SELECTIONS_KEY_PREFIX = "housie_selections_";

export function getSelectionsKey(code: string, myId: string) {
  return `${SELECTIONS_KEY_PREFIX}${code.toUpperCase()}_${myId}`;
}

export function saveRoomSession(
  code: string,
  role: "host" | "player",
  id: string
) {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({ code: code.toUpperCase(), role, id });
    sessionStorage.setItem(ROOM_SESSION_KEY, payload);
    localStorage.setItem(ROOM_SESSION_KEY, payload);
  } catch {}
}

export function clearRoomSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ROOM_SESSION_KEY);
    localStorage.removeItem(ROOM_SESSION_KEY);
  } catch {}
}

export function clearSelectionsForRoom(code: string, myId: string) {
  if (typeof window === "undefined" || !code || !myId) return;
  try {
    sessionStorage.removeItem(getSelectionsKey(code, myId));
  } catch {}
}

export function loadSelections(
  code: string,
  myId: string
): Record<number, Set<number>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(getSelectionsKey(code, myId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number[]>;
    const out: Record<number, Set<number>> = {};
    for (const [k, arr] of Object.entries(parsed)) {
      const idx = parseInt(k, 10);
      if (!Number.isNaN(idx) && Array.isArray(arr)) out[idx] = new Set(arr);
    }
    return out;
  } catch {
    return {};
  }
}

export function saveSelections(
  code: string,
  myId: string,
  selectedByTicket: Record<number, Set<number>>
) {
  if (typeof window === "undefined" || !code || !myId) return;
  try {
    const obj: Record<string, number[]> = {};
    for (const [k, set] of Object.entries(selectedByTicket)) {
      obj[String(k)] = Array.from(set);
    }
    sessionStorage.setItem(getSelectionsKey(code, myId), JSON.stringify(obj));
  } catch {}
}

export function getNumbersInRow(
  ticket: TicketGrid,
  rowIndex: number
): number[] {
  const row = ticket[rowIndex];
  if (!row) return [];
  return row.filter((c): c is number => c !== null);
}

export function getAllNumbersInTicket(ticket: TicketGrid): number[] {
  const out: number[] = [];
  for (let r = 0; r < ticket.length; r++) {
    for (let c = 0; c < ticket[r]!.length; c++) {
      const v = ticket[r]![c];
      if (v !== null) out.push(v);
    }
  }
  return out;
}

/** Last number in drawn order that appears in the set (winning number for a claim). */
export function getWinningNumberForSet(
  drawn: number[],
  numbers: number[]
): number | null {
  const set = new Set(numbers);
  for (let i = drawn.length - 1; i >= 0; i--) {
    if (set.has(drawn[i]!)) return drawn[i]!;
  }
  return null;
}

export const CLAIM_LABELS: Record<string, string> = {
  jaldiFive: "Jaldi Five",
  firstLine: "First Line",
  middleLine: "Middle Line",
  lastLine: "Last Line",
  housie: "Housie",
};

/** In-game: show only the winning (last) number per claim. */
export function formatClaimWinner(entry: ClaimEntry) {
  return `${entry.playerName} (${entry.winningNumber})`;
}
