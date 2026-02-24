"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CreateRoomPage() {
  const router = useRouter();
  const [ticketPrice, setTicketPrice] = useState(10);
  const [hostTicketCount, setHostTicketCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketPrice, hostTicketCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create room");
        return;
      }
      router.push(`/room/${data.roomCode}?hostId=${data.hostId}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="border-b border-neutral-300 bg-white px-4 py-3">
        <Link href="/" className="text-neutral-600 hover:text-neutral-800">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold text-neutral-800 mt-1">
          Create room
        </h1>
      </header>

      <main className="mx-auto max-w-sm px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-neutral-700">
            Ticket price (Rs per ticket)
          </label>
          <input
            type="number"
            min={1}
            step={1}
            value={ticketPrice}
            onChange={(e) => setTicketPrice(Number(e.target.value) || 1)}
            className="w-full rounded border border-neutral-400 bg-white px-3 py-2"
          />
          <label className="block text-sm font-medium text-neutral-700">
            Your tickets (0–6)
          </label>
          <select
            value={hostTicketCount}
            onChange={(e) => setHostTicketCount(Number(e.target.value))}
            className="w-full rounded border border-neutral-400 bg-white px-3 py-2"
          >
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-neutral-800 py-2 text-white font-medium disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create room"}
          </button>
        </form>
      </main>
    </div>
  );
}
