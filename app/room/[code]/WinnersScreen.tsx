"use client";

import { Button } from "@/components/Button";
import { getClaimPrizeAmounts } from "@/lib/rooms";
import { motion } from "framer-motion";
import type { ClaimEntry, RoomState } from "./types";

const CLAIM_LABELS: Record<string, string> = {
  jaldiFive: "Jaldi Five",
  firstLine: "First line",
  middleLine: "Middle line",
  lastLine: "Last line",
  housie: "Housie",
};

type ClaimKey = keyof typeof CLAIM_LABELS;

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

  const rows: { claimType: string; winner: string; prize: number }[] = [];

  (
    [
      { key: "jaldiFive" as const, entries: w.jaldiFiveClaimed, pool: pools?.jaldiFive ?? 0 },
      { key: "firstLine" as const, entries: w.firstLineClaimed, pool: pools?.firstLine ?? 0 },
      { key: "middleLine" as const, entries: w.middleLineClaimed, pool: pools?.middleLine ?? 0 },
      { key: "lastLine" as const, entries: w.lastLineClaimed, pool: pools?.lastLine ?? 0 },
      { key: "housie" as const, entries: w.housieClaimed, pool: pools?.housie ?? 0 },
    ] as const
  ).forEach(({ key, entries, pool }) => {
    if (!entries?.length || pool <= 0) return;
    const prizeEach = Math.round(pool / entries.length);
    const label = CLAIM_LABELS[key];
    entries.forEach((e: ClaimEntry) => {
      rows.push({ claimType: label, winner: e.playerName, prize: prizeEach });
    });
  });

  return (
    <motion.div
      initial={{ y: 32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "tween", duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-xl rounded-2xl p-8 md:p-10 bg-roomCard border-2 border-yellow/80 shadow-roomCardInner"
    >
      <h2 className="text-xl font-bold text-theme-primary text-center mb-2">
        Game Over – Winners
      </h2>
      {pools && (
        <p className="text-sm text-theme-muted text-center mb-6">
          Total pool: ₹{totalAmount}
        </p>
      )}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border-2 border-accent/30 bg-inputBg/50">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-accent/30">
                <th className="px-4 py-3 font-semibold text-theme-primary" />
                <th className="px-4 py-3 font-semibold text-theme-primary">
                  Winner
                </th>
                <th className="px-4 py-3 font-semibold text-theme-primary text-right">
                  Prize
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={`${row.claimType}-${row.winner}-${i}`}
                  className="border-b border-accent/20 last:border-b-0"
                >
                  <td className="px-4 py-3 text-theme-primary">
                    {row.claimType}
                  </td>
                  <td className="px-4 py-3 text-theme-primary font-medium">
                    {row.winner}
                  </td>
                  <td className="px-4 py-3 text-yellow font-semibold text-right">
                    ₹{row.prize}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-theme-muted text-center py-4">No winners.</p>
      )}

      <div className="pt-6 text-center">
        <Button type="button" variant="primary" onClick={onBackHome}>
          New game
        </Button>
      </div>
    </motion.div>
  );
}
