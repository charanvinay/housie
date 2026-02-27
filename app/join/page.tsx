"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/PageWrapper";
import { Button } from "@/components/Button";
import { Label } from "@/components/form/Label";
import { Input } from "@/components/form/Input";
import { TicketCounter } from "@/components/form/TicketCounter";

/** Single name for this browser profile (host and player use the same). */
const NAME_KEY = "player_name";
const ROOM_SESSION_KEY = "housie_room";

function getActiveRoomSession(): {
  code: string;
  role: string;
  id: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ROOM_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (
      data &&
      typeof data === "object" &&
      "code" in data &&
      "role" in data &&
      "id" in data
    ) {
      const d = data as { code: string; role: string; id: string };
      if (
        typeof d.code === "string" &&
        typeof d.role === "string" &&
        typeof d.id === "string"
      )
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

function JoinRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code") ?? "";

  const [roomCode, setRoomCode] = useState(codeFromUrl);
  const [playerName, setPlayerName] = useState("");
  const [ticketCount, setTicketCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [exitTargetUrl, setExitTargetUrl] = useState<string | null>(null);

  useEffect(() => {
    setRoomCode((c) => (codeFromUrl ? codeFromUrl : c));
  }, [codeFromUrl]);

  useEffect(() => {
    if (initialized) return;
    setPlayerName(getStoredName());
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
          router.replace(
            `/room/${room.code}?hostId=${encodeURIComponent(session.id)}`
          );
          return;
        }
        if (
          session.role === "player" &&
          Array.isArray(room.players) &&
          room.players.some((p: { id: string }) => p.id === session.id)
        ) {
          router.replace(
            `/room/${room.code}?playerId=${encodeURIComponent(session.id)}`
          );
        }
      })
      .catch(() => setCheckingSession(false));
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const code = roomCode.trim().toUpperCase();
    const name = playerName.trim();
    if (!code) {
      setError("Enter room code");
      return;
    }
    if (!name) {
      setError("Your name is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: name,
          ticketCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to join");
        return;
      }
      setStoredName(name);
      setExiting(true);
      setExitTargetUrl(`/room/${data.roomCode}?playerId=${data.playerId}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const handleExitComplete = () => {
    if (exitTargetUrl) {
      const url = exitTargetUrl;
      setExitTargetUrl(null);
      router.push(url);
      // Keep exiting true so content stays hidden until route changes
    } else {
      setExiting(false);
    }
  };

  return (
    <PageWrapper
      showBack
      cardTitle="Join room"
      exiting={exiting}
      onExitComplete={handleExitComplete}
      onBackClick={() => {
        setExiting(true);
        setExitTargetUrl("/");
      }}
    >
      {checkingSession ? (
        <p className="text-theme-muted">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="roomCode">Room code</Label>
            <Input
              id="roomCode"
              type="text"
              placeholder="e.g. ABC123"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="uppercase"
            />
          </div>
          <div>
            <Label htmlFor="playerName" required>
              Your name
            </Label>
            <Input
              id="playerName"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <TicketCounter
            label="Number of tickets (1–6)"
            value={ticketCount}
            min={1}
            max={6}
            onChange={setTicketCount}
          />
          {error && <p className="form-error">{error}</p>}
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Joining…" : "Join room"}
          </Button>
        </form>
      )}
    </PageWrapper>
  );
}

export default function JoinRoomPage() {
  return (
    <Suspense
      fallback={
        <PageWrapper showBack cardTitle="Join room">
          <p className="text-theme-muted">Loading…</p>
        </PageWrapper>
      }
    >
      <JoinRoomContent />
    </Suspense>
  );
}
