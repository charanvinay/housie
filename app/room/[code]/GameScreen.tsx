"use client";

import type { ClaimEntry, RoomState } from "./types";
import {
  CLAIM_LABELS,
  formatClaimWinner,
  getAllNumbersInTicket,
  getNumbersInRow,
} from "./room-utils";

export type GameScreenProps = {
  room: RoomState;
  isHost: boolean;
  myId: string;
  drawing: boolean;
  onDrawNumber: () => void;
  selectedByTicket: Record<number, Set<number>>;
  onToggleNumber: (ticketIndex: number, num: number) => void;
  claiming: boolean;
  claimError: string;
  onClaim: (
    ticketIndex: number,
    claimTypes: (
      | "jaldiFive"
      | "firstLine"
      | "middleLine"
      | "lastLine"
      | "housie"
    )[],
    jaldiFiveNumbers?: number[]
  ) => void;
};

export function GameScreen({
  room,
  isHost,
  myId,
  drawing,
  onDrawNumber,
  selectedByTicket,
  onToggleNumber,
  claiming,
  claimError,
  onClaim,
}: GameScreenProps) {
  const tickets =
    (room.playerTickets && myId ? room.playerTickets[myId] : null) ?? [];
  const drawn = room.drawnNumbers ?? [];
  const currentNumber = drawn.length > 0 ? drawn[drawn.length - 1]! : null;
  const drawnSet = new Set(drawn);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border-2 border-neutral-400 bg-white p-6 text-center">
        <p className="text-sm font-medium text-neutral-600 mb-1">
          Current number
        </p>
        {isHost ? (
          <div className="flex flex-col gap-3 items-center">
            <p className="text-4xl font-bold text-neutral-900">
              {currentNumber ?? "—"}
            </p>
            <button
              type="button"
              onClick={onDrawNumber}
              disabled={drawing || drawn.length >= 90}
              className="rounded-lg bg-green-600 px-6 py-2 text-white font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {drawing ? "Drawing…" : "Pick next number"}
            </button>
          </div>
        ) : (
          <p className="text-4xl font-bold text-neutral-900">
            {currentNumber ?? "—"}
          </p>
        )}
      </section>

      {room.jaldiFiveClaimed?.length ||
      room.firstLineClaimed?.length ||
      room.middleLineClaimed?.length ||
      room.lastLineClaimed?.length ? (
        <section className="rounded-lg border border-green-500 bg-green-50 p-3 text-center space-y-1">
          {room.jaldiFiveClaimed?.length ? (
            <p className="text-sm font-medium text-green-800">
              Jaldi Five:{" "}
              {room.jaldiFiveClaimed.map(formatClaimWinner).join(", ")}
            </p>
          ) : null}
          {room.firstLineClaimed?.length ? (
            <p className="text-sm font-medium text-green-800">
              First line:{" "}
              {room.firstLineClaimed.map(formatClaimWinner).join(", ")}
            </p>
          ) : null}
          {room.middleLineClaimed?.length ? (
            <p className="text-sm font-medium text-green-800">
              Middle line:{" "}
              {room.middleLineClaimed.map(formatClaimWinner).join(", ")}
            </p>
          ) : null}
          {room.lastLineClaimed?.length ? (
            <p className="text-sm font-medium text-green-800">
              Last line:{" "}
              {room.lastLineClaimed.map(formatClaimWinner).join(", ")}
            </p>
          ) : null}
        </section>
      ) : null}

      {claimError && (
        <p className="text-sm text-red-600 text-center">{claimError}</p>
      )}

      <section>
        <h2 className="font-medium text-neutral-800 mb-3">My tickets</h2>
        <div className="space-y-6">
          {tickets.length === 0 ? (
            <p className="text-neutral-500 text-sm">No tickets.</p>
          ) : (
            tickets.map((ticket, ticketIndex) => {
              const selected = selectedByTicket[ticketIndex] ?? new Set();
              const selectedList = Array.from(selected);
              const alreadyClaimedByMe = (arr?: ClaimEntry[]) =>
                arr?.some((e) => e.playerId === myId) ?? false;
              const noOneClaimedYet = (arr?: ClaimEntry[]) => !arr?.length;

              const row0 = getNumbersInRow(ticket, 0);
              const row1 = getNumbersInRow(ticket, 1);
              const row2 = getNumbersInRow(ticket, 2);
              const all15 = getAllNumbersInTicket(ticket);

              const jaldiFiveOk =
                selectedList.length === 5 &&
                selectedList.every((n) => drawnSet.has(n)) &&
                noOneClaimedYet(room.jaldiFiveClaimed) &&
                !alreadyClaimedByMe(room.jaldiFiveClaimed);

              const firstLineOk =
                row0.length === 5 &&
                row0.every((n) => drawnSet.has(n)) &&
                noOneClaimedYet(room.firstLineClaimed) &&
                !alreadyClaimedByMe(room.firstLineClaimed);

              const middleLineOk =
                row1.length === 5 &&
                row1.every((n) => drawnSet.has(n)) &&
                noOneClaimedYet(room.middleLineClaimed) &&
                !alreadyClaimedByMe(room.middleLineClaimed);

              const lastLineOk =
                row2.length === 5 &&
                row2.every((n) => drawnSet.has(n)) &&
                noOneClaimedYet(room.lastLineClaimed) &&
                !alreadyClaimedByMe(room.lastLineClaimed);

              const housieOk =
                all15.length === 15 &&
                all15.every((n) => drawnSet.has(n)) &&
                noOneClaimedYet(room.housieClaimed) &&
                !alreadyClaimedByMe(room.housieClaimed);
              const row0Complete =
                row0.length === 5 && row0.every((n) => drawnSet.has(n));
              const row1Complete =
                row1.length === 5 && row1.every((n) => drawnSet.has(n));
              const row2Complete =
                row2.length === 5 && row2.every((n) => drawnSet.has(n));

              const eligibleTypes: (
                | "jaldiFive"
                | "firstLine"
                | "middleLine"
                | "lastLine"
                | "housie"
              )[] = [];
              if (jaldiFiveOk) eligibleTypes.push("jaldiFive");
              if (firstLineOk) eligibleTypes.push("firstLine");
              if (middleLineOk) eligibleTypes.push("middleLine");
              if (lastLineOk) eligibleTypes.push("lastLine");
              if (housieOk) eligibleTypes.push("housie");

              const hasAnyClaim = eligibleTypes.length > 0;

              const handleClaimClick = () => {
                onClaim(
                  ticketIndex,
                  eligibleTypes,
                  eligibleTypes.includes("jaldiFive") ? selectedList : undefined
                );
              };

              return (
                <div
                  key={ticketIndex}
                  className="relative rounded-lg border border-neutral-300 bg-white p-3"
                >
                  <p className="text-xs text-neutral-500 mb-2">
                    Ticket {ticketIndex + 1}
                  </p>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse text-center table-fixed">
                      <colgroup>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                          <col key={i} style={{ width: "11.111%" }} />
                        ))}
                      </colgroup>
                      <tbody>
                        {ticket.map((row, r) => {
                          const rowComplete =
                            r === 0
                              ? row0Complete
                              : r === 1
                                ? row1Complete
                                : row2Complete;
                          return (
                            <tr key={r} className="relative">
                              {row.map((cell, c) => {
                                const num = cell;
                                const isDrawn =
                                  num !== null && drawnSet.has(num);
                                const isSelected =
                                  num !== null && selected.has(num);
                                return (
                                  <td
                                    key={c}
                                    className={`border border-neutral-300 p-1 h-9 text-sm select-none ${
                                      num === null
                                        ? "bg-neutral-100"
                                        : isSelected
                                          ? "bg-green-400 text-white font-medium"
                                          : isDrawn
                                            ? "bg-green-100"
                                            : "bg-white hover:bg-neutral-100 cursor-pointer"
                                    }`}
                                    onClick={() =>
                                      num !== null &&
                                      onToggleNumber(ticketIndex, num)
                                    }
                                    role={num !== null ? "button" : undefined}
                                  >
                                    {num ?? ""}
                                  </td>
                                );
                              })}
                              {rowComplete ? (
                                <td
                                  colSpan={9}
                                  aria-hidden
                                  className="absolute border-0 p-0 m-0 pointer-events-none"
                                  style={{
                                    left: 0,
                                    right: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: "100%",
                                    minWidth: "100%",
                                    boxSizing: "border-box",
                                  }}
                                >
                                  <div
                                    className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-red-500"
                                    style={{
                                      left: 0,
                                      right: 0,
                                      width: "100%",
                                    }}
                                  />
                                </td>
                              ) : null}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {hasAnyClaim && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-black/60 p-4">
                      <button
                        type="button"
                        onClick={handleClaimClick}
                        disabled={claiming}
                        className="rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {claiming
                          ? "Claiming…"
                          : `Claim ${eligibleTypes
                              .map((t) => CLAIM_LABELS[t])
                              .join(" & ")}`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
