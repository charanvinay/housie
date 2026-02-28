"use client";

import { Button } from "@/components/Button";
import { motion } from "framer-motion";

export function GameEndedNoWinners({
  onBackHome,
}: {
  onBackHome: () => void;
}) {
  return (
    <motion.div
      initial={{ y: 32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "tween", duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-xl rounded-2xl p-8 md:p-10 bg-roomCard border-2 border-yellow/80 shadow-roomCardInner"
    >
      <h2 className="text-xl font-bold text-theme-primary text-center mb-2">
        Game ended
      </h2>
      <p className="text-sm text-theme-muted text-center mb-6">
        The host ended the game before it started.
      </p>
      <div className="pt-2 text-center">
        <Button type="button" variant="primary" onClick={onBackHome}>
          New game
        </Button>
      </div>
    </motion.div>
  );
}
