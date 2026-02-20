"use client";

import { useState, useMemo } from "react";
import { Ticket } from "@/components/Ticket";
import { generateTickets } from "@/lib/ticket";

export default function Home() {
  const [ticketCount, setTicketCount] = useState(2);
  const [regenerateKey, setRegenerateKey] = useState(0);
  const tickets = useMemo(
    () => generateTickets(ticketCount),
    [ticketCount, regenerateKey]
  );

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="border-b border-neutral-300 bg-white px-4 py-3">
        <h1 className="text-xl font-semibold text-neutral-800">Tambola</h1>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <section className="mb-6 flex flex-wrap items-center gap-4">
          <label className="text-sm text-neutral-600">
            Tickets to show:
            <select
              value={ticketCount}
              onChange={(e) => setTicketCount(Number(e.target.value))}
              className="ml-2 rounded border border-neutral-400 bg-white px-2 py-1"
            >
              {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setRegenerateKey((k) => k + 1)}
            className="rounded border border-neutral-400 bg-white px-3 py-1 text-sm"
          >
            Regenerate
          </button>
        </section>

        {/* Desktop: 2 tickets per row; mobile: stacked */}
        <section className="grid gap-6 sm:grid-cols-2" aria-label="Ticket grid">
          {tickets.map((ticket, i) => (
            <Ticket key={i} ticket={ticket} label={`Ticket ${i + 1}`} />
          ))}
        </section>
      </main>
    </div>
  );
}
