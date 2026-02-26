/**
 * Housie ticket generator.
 * See docs/TICKET_GENERATION.md for the logic.
 */

export type TicketCell = number | null;

/** A ticket: 3 rows × 9 columns; null = empty cell */
export type Ticket = TicketCell[][];

const ROW_COUNT = 3;
const COLUMN_COUNT = 9;
const NUMBERS_PER_TICKET = 15;
const NUMBERS_PER_ROW = 5;
const MAX_TICKETS = 6;

/** How many numbers exist in each column's range: col0=9, col1..7=10, col8=11 */
const NUMBERS_IN_COLUMN_RANGE = [9, 10, 10, 10, 10, 10, 10, 10, 11] as const;

function getColumnMinMax(columnIndex: number): { min: number; max: number } {
  if (columnIndex === 0) return { min: 1, max: 9 };
  if (columnIndex === COLUMN_COUNT - 1) return { min: 80, max: 90 };
  const min = columnIndex * 10;
  return { min, max: min + 9 };
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Pick n distinct random numbers in [min, max], returned sorted ascending */
function pickRandomSorted(min: number, max: number, n: number): number[] {
  const pool: number[] = [];
  for (let v = min; v <= max; v++) pool.push(v);
  const chosen: number[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool[idx]);
    pool.splice(idx, 1);
  }
  chosen.sort((a, b) => a - b);
  return chosen;
}

/**
 * Decide which cells in the 3×9 grid get a number.
 * Rules: exactly 5 cells per row, and column j gets exactly cellsInColumn[j] cells (1–3).
 * Process columns with more cells first so we don't run out of row capacity.
 */
function decideWhichCellsGetNumbers(cellsPerColumn: number[]): boolean[][] {
  const hasNumber: boolean[][] = Array.from({ length: ROW_COUNT }, () =>
    Array(COLUMN_COUNT).fill(false)
  );
  const cellsLeftPerRow = [NUMBERS_PER_ROW, NUMBERS_PER_ROW, NUMBERS_PER_ROW];

  const columnsWithCount = cellsPerColumn
    .map((count, col) => ({ columnIndex: col, cellCount: count }))
    .sort((a, b) => b.cellCount - a.cellCount);

  for (const { columnIndex, cellCount } of columnsWithCount) {
    const rowsThatCanTakeMore = [0, 1, 2]
      .filter((r) => cellsLeftPerRow[r] > 0)
      .sort((a, b) => cellsLeftPerRow[b] - cellsLeftPerRow[a])
      .slice(0, cellCount);

    if (rowsThatCanTakeMore.length !== cellCount) break;

    for (const rowIndex of rowsThatCanTakeMore) {
      hasNumber[rowIndex][columnIndex] = true;
      cellsLeftPerRow[rowIndex]--;
    }
  }

  return hasNumber;
}

/**
 * Fill one ticket: use the given cell placement and assign numbers from the given
 * values per column (already sorted). Values are taken in order for each column.
 */
function fillTicketGrid(
  whichCellsHaveNumber: boolean[][],
  numbersForEachColumn: number[][]
): Ticket {
  const grid: Ticket = Array.from({ length: ROW_COUNT }, () =>
    Array(COLUMN_COUNT).fill(null)
  );

  for (let col = 0; col < COLUMN_COUNT; col++) {
    const rowIndices = [0, 1, 2].filter((r) => whichCellsHaveNumber[r][col]);
    rowIndices.sort((a, b) => a - b);
    const values = numbersForEachColumn[col];
    rowIndices.forEach((rowIndex, i) => {
      grid[rowIndex][col] = values[i];
    });
  }

  return grid;
}

/**
 * Build one ticket with random numbers, using the given cells-per-column layout.
 */
function buildOneTicket(cellsPerColumn: number[]): Ticket {
  const whichCellsHaveNumber = decideWhichCellsGetNumbers(cellsPerColumn);
  const numbersForEachColumn: number[][] = [];

  for (let col = 0; col < COLUMN_COUNT; col++) {
    const { min, max } = getColumnMinMax(col);
    const count = [0, 1, 2].filter((r) => whichCellsHaveNumber[r][col]).length;
    numbersForEachColumn[col] = pickRandomSorted(min, max, count);
  }

  return fillTicketGrid(whichCellsHaveNumber, numbersForEachColumn);
}

/**
 * Generate one Housie ticket (standalone). Numbers can repeat if you generate multiple.
 */
export function generateTicket(): Ticket {
  const cellsPerColumn = shuffleArray([2, 2, 2, 2, 2, 2, 1, 1, 1]);
  return buildOneTicket(cellsPerColumn);
}

/**
 * Choose how many numbers to use from each column so that:
 * - Total across columns = numTickets * 15 (we use that many numbers from 1–90).
 * - Per column: at least numTickets, at most NUMBERS_IN_COLUMN_RANGE[col].
 */
function chooseTotalNumbersPerColumn(numTickets: number): number[] {
  const totalNumbersNeeded = numTickets * NUMBERS_PER_TICKET;
  const totalPerColumn = Array(COLUMN_COUNT).fill(numTickets);

  let added = 0;
  const maxToAdd = totalNumbersNeeded - COLUMN_COUNT * numTickets;

  while (added < maxToAdd) {
    const col = Math.floor(Math.random() * COLUMN_COUNT);
    if (totalPerColumn[col] < NUMBERS_IN_COLUMN_RANGE[col]) {
      totalPerColumn[col]++;
      added++;
    }
  }

  return totalPerColumn;
}

/**
 * Build demand matrix for n tickets: n × 9, each row sums to 15, column j sums to totalPerColumn[j].
 * Each cell is 1–3. Start from 1 everywhere, then add extras so column sums match.
 */
function buildDemandMatrix(
  numTickets: number,
  totalNumbersPerColumn: number[]
): number[][] {
  const cellsPerTicketPerColumn: number[][] = Array.from(
    { length: numTickets },
    () => Array(COLUMN_COUNT).fill(1)
  );
  const cellsUsedPerTicket = Array(numTickets).fill(COLUMN_COUNT);

  for (let col = 0; col < COLUMN_COUNT; col++) {
    const extrasToAdd = totalNumbersPerColumn[col] - numTickets;

    for (let e = 0; e < extrasToAdd; e++) {
      const candidates = Array.from({ length: numTickets }, (_, t) => t)
        .filter(
          (t) =>
            cellsUsedPerTicket[t] < NUMBERS_PER_TICKET &&
            cellsPerTicketPerColumn[t][col] < 3
        )
        .sort((a, b) => cellsUsedPerTicket[a] - cellsUsedPerTicket[b]);
      const ticketIndex = candidates[0];
      if (ticketIndex === undefined) {
        return [];
      }
      cellsPerTicketPerColumn[ticketIndex][col]++;
      cellsUsedPerTicket[ticketIndex]++;
    }
  }

  return cellsPerTicketPerColumn;
}

/**
 * Generate numTickets (1–6) with no number repeated across tickets.
 * We use 15*numTickets numbers from 1–90 and assign each to exactly one ticket.
 */
function generateTicketsWithNoRepeats(numTickets: number): Ticket[] {
  const totalNumbersPerColumn = chooseTotalNumbersPerColumn(numTickets);
  const cellsPerTicketPerColumn = buildDemandMatrix(
    numTickets,
    totalNumbersPerColumn
  );

  if (cellsPerTicketPerColumn.length === 0) {
    return Array.from({ length: numTickets }, () => generateTicket());
  }

  const shuffledPoolByColumn: number[][] = [];
  for (let col = 0; col < COLUMN_COUNT; col++) {
    const { min, max } = getColumnMinMax(col);
    const fullRange = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    const shuffled = shuffleArray(fullRange);
    shuffledPoolByColumn[col] = shuffled.slice(0, totalNumbersPerColumn[col]);
  }

  const tickets: Ticket[] = [];

  for (let ticketIndex = 0; ticketIndex < numTickets; ticketIndex++) {
    const cellsPerColumn = cellsPerTicketPerColumn[ticketIndex];
    const whichCellsHaveNumber = decideWhichCellsGetNumbers(cellsPerColumn);
    const numbersForEachColumn: number[][] = [];

    for (let col = 0; col < COLUMN_COUNT; col++) {
      const pool = shuffledPoolByColumn[col];
      let offset = 0;
      for (let t = 0; t < ticketIndex; t++) {
        offset += cellsPerTicketPerColumn[t][col];
      }
      const count = cellsPerColumn[col];
      const thisTicketsNumbers = pool
        .slice(offset, offset + count)
        .sort((a, b) => a - b);
      numbersForEachColumn[col] = thisTicketsNumbers;
    }

    tickets.push(fillTicketGrid(whichCellsHaveNumber, numbersForEachColumn));
  }

  return tickets;
}

/**
 * Generate 1–6 tickets. No number ever appears on more than one ticket.
 * For 6 tickets, all 90 numbers are used; for fewer, we use 15*n numbers from 1–90.
 */
export function generateTickets(count: number): Ticket[] {
  const numTickets = Math.min(Math.max(1, count), MAX_TICKETS);
  return generateTicketsWithNoRepeats(numTickets);
}
