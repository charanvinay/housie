"use client";

export function GameEndedNoWinners({
  onBackHome,
}: {
  onBackHome: () => void;
}) {
  return (
    <div className="rounded-lg border-2 border-neutral-400 bg-white p-6 space-y-4">
      <h2 className="text-xl font-bold text-neutral-900 text-center">
        Game ended
      </h2>
      <p className="text-sm text-neutral-500 text-center">
        The host ended the game before it started.
      </p>
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
