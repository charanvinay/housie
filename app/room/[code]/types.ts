export type Player = {
  id: string;
  name: string;
  ticketCount: number;
};

/** Ticket: 3 rows × 9 columns; null = empty cell */
export type TicketGrid = (number | null)[][];

export type ClaimEntry = {
  playerId: string;
  playerName: string;
  winningNumber: number;
};

export type RoomState = {
  code: string;
  ticketPrice: number;
  hostId: string;
  players: Player[];
  status: string;
  totalTickets?: number;
  totalAmount?: number;
  drawnNumbers?: number[];
  playerTickets?: Record<string, TicketGrid[]>;
  jaldiFiveClaimed?: ClaimEntry[];
  firstLineClaimed?: ClaimEntry[];
  middleLineClaimed?: ClaimEntry[];
  lastLineClaimed?: ClaimEntry[];
  housieClaimed?: ClaimEntry[];
};
