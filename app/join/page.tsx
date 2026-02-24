"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function JoinRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code") ?? "";

  const [roomCode, setRoomCode] = useState(codeFromUrl);
  const [playerName, setPlayerName] = useState("");
  const [ticketCount, setTicketCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setRoomCode((c) => (codeFromUrl ? codeFromUrl : c));
  }, [codeFromUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setError("Enter room code");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: playerName.trim() || "Player",
          ticketCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to join");
        return;
      }
      router.push(
        `/room/${data.roomCode}?playerId=${data.playerId}`
      );
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
          Join room
        </h1>
      </header>

      <main className="mx-auto max-w-sm px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-neutral-700">
            Room code
          </label>
          <input
            type="text"
            placeholder="e.g. ABC123"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="w-full rounded border border-neutral-400 bg-white px-3 py-2 uppercase"
          />
          <label className="block text-sm font-medium text-neutral-700">
            Your name (optional)
          </label>
          <input
            type="text"
            placeholder="Player"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full rounded border border-neutral-400 bg-white px-3 py-2"
          />
          <label className="block text-sm font-medium text-neutral-700">
            Number of tickets (1–6)
          </label>
          <select
            value={ticketCount}
            onChange={(e) => setTicketCount(Number(e.target.value))}
            className="w-full rounded border border-neutral-400 bg-white px-3 py-2"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
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
            {loading ? "Joining…" : "Join room"}
          </button>
        </form>
      </main>
    </div>
  );
}
