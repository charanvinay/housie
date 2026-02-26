"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** Single name for this browser profile (host and player use the same). */
const NAME_KEY = "player_name";
const ROOM_SESSION_KEY = "housie_room";

function getActiveRoomSession(): { code: string; role: string; id: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ROOM_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (data && typeof data === "object" && "code" in data && "role" in data && "id" in data) {
      const d = data as { code: string; role: string; id: string };
      if (typeof d.code === "string" && typeof d.role === "string" && typeof d.id === "string")
        return d;
    }
  } catch {}
  return null;
}

function getStoredName(): string {
  if (typeof window === "undefined") return "";
  try {
    const s = localStorage.getItem(NAME_KEY);
    return typeof s === "string" ? s.trim() : "";
  } catch {
    return "";
  }
}

function setStoredName(name: string) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = name.trim();
    if (trimmed) localStorage.setItem(NAME_KEY, trimmed);
  } catch {}
}

export default function CreateRoomPage() {
  const router = useRouter();
  const [hostName, setHostName] = useState("");
  const [ticketPrice, setTicketPrice] = useState(10);
  const [hostTicketCount, setHostTicketCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (initialized) return;
    setHostName(getStoredName());
    setInitialized(true);
  }, [initialized]);

  // One instance per browser: if already in a room, go there instead of creating another
  useEffect(() => {
    const session = getActiveRoomSession();
    if (!session) {
      setCheckingSession(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/rooms/${encodeURIComponent(session.code)}`)
      .then((res) => {
        if (cancelled || !res.ok) return null;
        return res.json();
      })
      .then((room) => {
        if (cancelled) return;
        setCheckingSession(false);
        if (!room || room.status === "ended") return;
        if (session.role === "host" && room.hostId === session.id) {
          router.replace(`/room/${room.code}?hostId=${encodeURIComponent(session.id)}`);
          return;
        }
        if (session.role === "player" && Array.isArray(room.players) && room.players.some((p: { id: string }) => p.id === session.id)) {
          router.replace(`/room/${room.code}?playerId=${encodeURIComponent(session.id)}`);
        }
      })
      .catch(() => setCheckingSession(false));
    return () => { cancelled = true; };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const name = hostName.trim();
    if (!name) {
      setError("Your name is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName: name,
          ticketPrice,
          hostTicketCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create room");
        return;
      }
      setStoredName(name);
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
        {checkingSession ? (
          <p className="text-neutral-600">Loading…</p>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-neutral-700">
            Your name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Enter your name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            required
            className="w-full rounded border border-neutral-400 bg-white px-3 py-2"
            autoComplete="name"
          />
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
        )}
      </main>
    </div>
  );
}
