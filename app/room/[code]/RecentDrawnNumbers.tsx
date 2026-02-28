"use client";

import { FaArrowRight } from "react-icons/fa6";

type RecentDrawnNumbersProps = {
  drawn: number[];
};

export function RecentDrawnNumbers({ drawn }: RecentDrawnNumbersProps) {
  const recentFive = drawn.slice(-5);

  if (recentFive.length === 0) {
    return (
      <div className="col-span-3 flex flex-wrap items-center justify-center gap-1 py-2 px-2 shrink-0">
        <span className="text-sm text-theme-muted">No numbers drawn yet</span>
      </div>
    );
  }

  return (
    <div className="col-span-3 flex flex-wrap items-center justify-center gap-1 py-2 px-2 shrink-0">
      {recentFive.map((num, i) => {
        const n = recentFive.length;
        const t = n <= 1 ? 1 : i / (n - 1);
        const bgOpacity = 0.4 + t * 0.55;
        const textOpacity = 0.5 + t * 0.5;
        const borderOpacity = 0.3 + t * 0.5;
        return (
          <span key={`${num}-${i}`} className="flex items-center gap-3">
            <span
              className="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-bold"
              style={{
                backgroundColor: `rgba(22, 163, 74, ${bgOpacity})`,
                color: `rgba(220, 252, 231, ${textOpacity})`,
                border: `1px solid rgba(134, 239, 172, ${borderOpacity})`,
              }}
            >
              {num}
            </span>
            {i < recentFive.length - 1 && (
              <FaArrowRight
                className="size-3 shrink-0 mr-2 text-accent"
                aria-hidden
              />
            )}
          </span>
        );
      })}
    </div>
  );
}
