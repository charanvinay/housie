"use client";

import { FiMinus, FiPlus } from "react-icons/fi";
import { IconButton } from "@/components/IconButton";

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
        <IconButton
          type="button"
          icon={<FiMinus className="size-5" />}
          onClick={decrement}
          disabled={value <= min}
          aria-label="Decrease"
        />
        <span
          className="w-10 text-center text-lg font-semibold text-theme-primary tabular-nums"
          aria-live="polite"
        >
          {value}
        </span>
        <IconButton
          type="button"
          icon={<FiPlus className="size-5" />}
          onClick={increment}
          disabled={value >= max}
          aria-label="Increase"
        />
      </div>
    </div>
  );
}
