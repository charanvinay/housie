"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/PageWrapper";
import { Button } from "@/components/Button";
import { Label } from "@/components/form/Label";
import { Input } from "@/components/form/Input";
import { TicketCounter } from "@/components/form/TicketCounter";

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
    <PageWrapper showBack cardTitle="Create room">
      {checkingSession ? (
        <p className="text-neutral-600">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="hostName" required>Your name</Label>
            <Input
              id="hostName"
              type="text"
              placeholder="Enter your name"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div>
            <Label htmlFor="ticketPrice">Ticket price (Rs per ticket)</Label>
            <Input
              id="ticketPrice"
              type="number"
              min={1}
              step={1}
              value={ticketPrice}
              onChange={(e) => setTicketPrice(Number(e.target.value) || 1)}
            />
          </div>
          <TicketCounter
            label="Your tickets (0–6)"
            value={hostTicketCount}
            min={0}
            max={6}
            onChange={setHostTicketCount}
          />
          {error && <p className="form-error">{error}</p>}
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Creating…" : "Create room"}
          </Button>
        </form>
      )}
    </PageWrapper>
  );
}
