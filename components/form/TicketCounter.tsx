"use client";

type TicketCounterProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
};

export function TicketCounter({
  value,
  min,
  max,
  onChange,
  label,
  className = "",
}: TicketCounterProps) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(Math.min(max, value + 1));

  return (
    <div
      className={`flex flex-row items-center justify-between gap-4 ${className}`.trim()}
    >
      {label && (
        <label className="form-label !mb-0 flex-shrink-0">{label}</label>
      )}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          aria-label="Decrease"
          className="counter-btn flex-shrink-0 w-10 h-10 rounded-xl border-2 border-[#0045f6] bg-white text-[#0045f6] font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f0f4ff] active:scale-95 transition-transform"
        >
          −
        </button>
        <span
          className="w-10 text-center text-lg font-semibold text-neutral-800 tabular-nums"
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          aria-label="Increase"
          className="counter-btn flex-shrink-0 w-10 h-10 rounded-xl border-2 border-[#0045f6] bg-white text-[#0045f6] font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f0f4ff] active:scale-95 transition-transform"
        >
          +
        </button>
      </div>
    </div>
  );
}
