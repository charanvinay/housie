"use client";

type LiveIndicatorProps = {
  live: boolean;
  /** Optional title for the wrapper (e.g. for tooltip) */
  title?: string;
  /** Optional class for the outer span */
  className?: string;
};

export function LiveIndicator({ live, title, className }: LiveIndicatorProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${
        live
          ? "border-green-500/50 bg-green-500/20 text-green-400"
          : "border-white/20 bg-white/10 text-theme-muted"
      } ${className ?? ""}`}
      title={title ?? (live ? "Real-time updates on" : "Connecting…")}
    >
      {live && (
        <span
          className="size-2 shrink-0 rounded-full bg-green-500 animate-pulse"
          aria-hidden
        />
      )}
      {live ? "Live" : "…"}
    </span>
  );
}
