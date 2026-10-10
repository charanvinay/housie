"use client";

import { Button } from "@/components/Button";
import { motion } from "framer-motion";

export function GameEndedNoWinners({
  isHost = false,
  message,
  onPlayAgain,
  onBackToLobby,
  onBackHome,
  restarting = false,
}: {
  isHost?: boolean;
  message?: string;
  onPlayAgain?: () => void;
  onBackToLobby?: () => void;
  onBackHome: () => void;
  restarting?: boolean;
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
        {message || "The host ended the game."}
      </p>
      {isHost ? (
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
          {onPlayAgain && (
            <Button
              type="button"
              variant="yellow"
              onClick={onPlayAgain}
              disabled={restarting}
              className="w-full sm:w-auto"
            >
              {restarting ? "Starting game…" : "Play again (same room)"}
            </Button>
          )}
          {onBackToLobby && (
            <Button
              type="button"
              variant="secondary"
              onClick={onBackToLobby}
              disabled={restarting}
              className="w-full sm:w-auto"
            >
              {restarting ? "Returning to lobby…" : "Return to lobby"}
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            onClick={onBackHome}
            disabled={restarting}
            className="w-full sm:w-auto"
          >
            Leave room
          </Button>
        </div>
      ) : (
        <div className="pt-2 flex flex-col items-center gap-3">
          <p className="text-sm text-theme-muted text-center animate-pulse">
            Waiting for host to reopen room or start another game…
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={onBackHome}
            className="w-full max-w-xs"
          >
            Leave room
          </Button>
        </div>
      )}
    </motion.div>
  );
}
