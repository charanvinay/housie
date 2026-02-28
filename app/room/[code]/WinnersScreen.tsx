"use client";

import { getClaimPrizeAmounts } from "@/lib/rooms";
import type { ClaimEntry, RoomState } from "./types";

export function WinnersScreen({
  room,
  onBackHome,
}: {
  room: RoomState;
  onBackHome: () => void;
}) {
  const w = room;
  const totalAmount = w.totalAmount ?? 0;
  const pools = totalAmount > 0 ? getClaimPrizeAmounts(totalAmount) : null;

  const renderWinners = (
    label: string,
    pool: number,
    entries?: ClaimEntry[]
  ) => {
    if (!entries?.length) return null;
    const prizeEach = pool / entries.length;
    return (
      <li className="text-neutral-700">
        <span className="font-medium">{label}:</span>{" "}
        {entries
          .map((e) => `${e.playerName} – ₹${Math.round(prizeEach)}`)
          .join(", ")}
      </li>
    );
  };

  return (
    <div className="rounded-lg border-2 border-neutral-400 bg-white p-6 space-y-4">
      <h2 className="text-xl font-bold text-neutral-900 text-center">
        Game Over – Winners
      </h2>
      {pools && (
        <p className="text-sm text-neutral-500 text-center">
          Total pool: ₹{totalAmount} (Jaldi Five ₹{pools.jaldiFive}, lines ₹
          {pools.firstLine} each, Housie ₹{pools.housie}; split equally when
          multiple winners)
        </p>
      )}
      <ul className="space-y-2 text-center">
        {pools &&
          renderWinners("Jaldi Five", pools.jaldiFive, w.jaldiFiveClaimed)}
        {pools &&
          renderWinners("First line", pools.firstLine, w.firstLineClaimed)}
        {pools &&
          renderWinners("Middle line", pools.middleLine, w.middleLineClaimed)}
        {pools &&
          renderWinners("Last line", pools.lastLine, w.lastLineClaimed)}
        {w.housieClaimed?.length && pools ? (
          <li className="text-lg font-semibold text-green-700">
            <span className="font-medium">Housie:</span>{" "}
            {w.housieClaimed
              .map((e) => {
                const prizeEach = pools.housie / w.housieClaimed!.length;
                return `${e.playerName} – ₹${Math.round(prizeEach)}`;
              })
              .join(", ")}
          </li>
        ) : null}
      </ul>
      <div className="pt-4 text-center">
        <button
          type="button"
          onClick={onBackHome}
          className="rounded-lg bg-neutral-800 px-6 py-3 text-white font-medium hover:bg-neutral-900"
        >
          Back to home
        </button>
      </div>
    </div>
  );
}
