# Tambola ticket generation logic

This document explains how we generate valid Tambola (Housie) tickets and how we ensure **no number is repeated** across tickets (for any count 1–6).

---

## Ticket rules

- **Grid:** 3 rows × 9 columns (27 cells).
- **Numbers:** Exactly **15 numbers** per ticket (so 12 cells are empty).
- **Per row:** Exactly **5 numbers** in each row.
- **Per column:** Between **1 and 3 numbers** in each column. Numbers in a column are in **ascending order** (top to bottom).
- **Column ranges:**
  - Column 0: 1–9  
  - Column 1: 10–19  
  - …  
  - Column 8: 80–90  

So each column has a fixed set of allowed numbers (e.g. column 0 only uses 1–9). There are 90 numbers in total (1–90).

---

## No repeats for any number of tickets (1–6)

- **No number ever appears on more than one ticket**, whether you generate 1 or 6 tickets.
- **1 ticket:** Uses 15 numbers from 1–90 (one pool per column, one slice).
- **2–5 tickets:** Uses 15×n numbers from 1–90, split across n tickets (no overlap).
- **6 tickets:** Uses **all 90 numbers** exactly once across the 6 tickets.

---

## How we build one ticket

### Step 1: Decide how many cells per column

We need 15 cells total and 5 per row. A valid pattern is: **6 columns with 2 numbers** and **3 columns with 1 number** (6×2 + 3×1 = 15). We shuffle this pattern so the “which column has 1 vs 2” is random.

So we get an array `cellsPerColumn[0..8]` where each value is 1 or 2, and the sum is 15.

### Step 2: Decide which cells get a number (placement)

We have to put 15 “number” cells in the 3×9 grid so that:

- Each **row** has exactly 5 cells.
- Each **column** `j` has exactly `cellsPerColumn[j]` cells.

We do this **column by column**, processing columns that need *more* cells first (e.g. 2 before 1). For each column we choose that many **rows** that still have capacity (row has fewer than 5 numbers so far). We prefer rows with the most capacity left so we don’t get stuck. The result is a 3×9 grid of booleans: “does this cell have a number?”.

### Step 3: Assign numbers to those cells

For each column `j`:

- We know which rows have a number in that column (from step 2).
- We pick that many **distinct random numbers** from that column’s range (e.g. 1–9 for column 0).
- We **sort** those numbers and put them into the chosen rows in ascending order (top to bottom).

Result: one valid ticket (15 numbers, 5 per row, 1–3 per column, ascending per column).

---

## How we build n tickets with no repeated numbers (n = 1–6)

We want **no number to appear on more than one ticket**. We use 15×n numbers from 1–90 and assign each to exactly one ticket.

### Step 1: Demand matrix (how many numbers per ticket per column)

We build a 6×9 matrix `cellsPerTicketPerColumn[ticket][col]`:

- Each **row** (one ticket) sums to **15** (15 numbers per ticket).
- Each **column** (one game column) sums to **how many numbers exist in that column’s range**:
  - Column 0: 9 (numbers 1–9)
  - Columns 1–7: 10 each
  - Column 8: 11 (80–90)

So we’re splitting “how many numbers from this column’s range go to each ticket” in a way that uses **all** numbers in that range and gives each ticket 15 numbers.

We start with 1 in every cell (so each ticket has 9 numbers and each column contributes 6). Then we add “extras” column by column until each column’s total matches the size of its range (9, 10, …, 11). When we add an extra, we give it to a ticket that (a) still has fewer than 15 numbers and (b) has fewer than 3 numbers in that column. We prefer tickets that have received fewer extras so far so that in the end each ticket gets 15 numbers.

### Step 2: One shuffled pool per column

For each column we take **all** numbers in its range (e.g. 1–9 for column 0) and **shuffle** them once. So we have 9 “pools”, one per column, and each pool contains every number in that column’s range, in random order.

### Step 3: Slice the pool per ticket (no number used twice)

For each column we **slice** that column’s shuffled pool into 6 **non-overlapping** segments:

- Segment 0: indices `0` to `cellsPerTicketPerColumn[0][col] - 1`
- Segment 1: next `cellsPerTicketPerColumn[1][col]` numbers
- …
- Segment 5: the last `cellsPerTicketPerColumn[5][col]` numbers

So **each number in the pool is in exactly one segment**. No number is shared between tickets.

### Step 4: Build each ticket

For each ticket we already know:

- How many numbers it gets in each column (from the demand matrix).
- Which cells in the 3×9 grid get a number (from “decide which cells get a number” using that ticket’s per-column counts).

We assign to that ticket the numbers from **its** segment for each column (sorted for ascending order in the column). Because the segments are non-overlapping and we use one pool per column, **no number is used on more than one ticket**.

---

## Summary

- **One ticket:** Random “cells per column” (6 twos, 3 ones) → placement (5 per row, 1–3 per column) → fill with random numbers from each column’s range.
- **Six tickets:** Demand matrix (15 per ticket, column totals = range sizes) → one shuffled pool per column → split each pool into 6 slices by demand → fill each ticket from its slices only. That guarantees **no duplicate numbers** across the 6 tickets and uses all 90 numbers.
