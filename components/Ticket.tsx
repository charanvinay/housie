"use client";

import type { Ticket as TicketType } from "@/lib/ticket";

type TicketProps = {
  ticket: TicketType;
  /** Optional label, e.g. "Ticket 1" */
  label?: string;
};

export function Ticket({ ticket, label }: TicketProps) {
  return (
    <div className="border border-neutral-300 bg-white p-2">
      {label ? (
        <div className="mb-1 text-center text-sm font-medium text-neutral-600">
          {label}
        </div>
      ) : null}
      <table
        className="w-full border-collapse text-center"
        role="grid"
        aria-label="Tambola ticket"
      >
        <tbody>
          {ticket.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, colIndex) => (
                <td
                  key={colIndex}
                  className="border border-neutral-400 p-1 w-[2.5rem] min-w-[2rem] h-8"
                >
                  {cell !== null ? cell : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
