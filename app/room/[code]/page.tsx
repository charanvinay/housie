"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

const ROOM_SESSION_KEY = "housie_room";

function saveRoomSession(code: string, role: "host" | "player", id: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ROOM_SESSION_KEY, JSON.stringify({ code: code.toUpperCase(), role, id }));
  } catch {}
}

function clearRoomSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ROOM_SESSION_KEY);
  } catch {}
}

type Player = {
  id: string;
  name: string;
  ticketCount: number;
};

/** Ticket: 3 rows × 9 columns; null = empty cell */
type TicketGrid = (number | null)[][];

type RoomState = {
  code: string;
  ticketPrice: number;
  hostId: string;
  players: Player[];
  status: string;
  totalTickets?: number;
  totalAmount?: number;
  drawnNumbers?: number[];
  playerTickets?: Record<string, TicketGrid[]>;
  jaldiFiveClaimed?: { playerId: string; playerName: string } | null;
};

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = params.code as string;
  const hostId = searchParams.get("hostId");
  const playerId = searchParams.get("playerId");

  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState("");
  const [leaveError, setLeaveError] = useState("");
  const [link, setLink] = useState("");
  const [live, setLive] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  /** Per-ticket selected numbers (ticketIndex -> Set of numbers) for Jaldi Five */
  const [selectedByTicket, setSelectedByTicket] = useState<Record<number, Set<number>>>({});
  const socketRef = useRef<Socket | null>(null);

  const isHost = Boolean(hostId && room?.hostId === hostId);
  const myId = isHost ? hostId : playerId;
  const canQuitAsPlayer =
    !isHost &&
    playerId &&
    room?.status === "waiting";

  // Persist this tab’s room context so "/" can redirect back (per-tab via sessionStorage)
  useEffect(() => {
    if (!code || !room) return;
    if (hostId && room.hostId === hostId) {
      saveRoomSession(code, "host", hostId);
    } else if (playerId && room.players.some((p) => p.id === playerId)) {
      saveRoomSession(code, "player", playerId);
    }
  }, [code, room, hostId, playerId]);

  // When game is ended, clear session and send everyone to home
  useEffect(() => {
    if (!room || room.status !== "ended") return;
    clearRoomSession();
    router.replace("/");
  }, [room?.status, router]);

  const handleGoHome = async (e: React.MouseEvent) => {
    if (!canQuitAsPlayer) return;
    e.preventDefault();
    if (leaving) return;
    setLeaveError("");
    setLeaving(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLeaveError(data.error || "Failed to leave room");
        setLeaving(false);
        return;
      }
      clearRoomSession();
      router.push("/");
    } catch {
      setLeaveError("Failed to leave room");
      setLeaving(false);
    }
  };

  const handleEndGame = async () => {
    if (!isHost || room?.status !== "waiting" || !hostId) return;
    if (ending) return;
    setEnding(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId }),
      });
      if (!res.ok) {
        setEnding(false);
        return;
      }
      clearRoomSession();
      router.push("/");
    } catch {
      setEnding(false);
    }
  };

  const handleStartGame = async () => {
    if (!isHost || room?.status !== "waiting" || !hostId) return;
    if (starting) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) setRoom(data.room);
      }
    } finally {
      setStarting(false);
    }
  };

  const handleDrawNumber = async () => {
    if (!isHost || room?.status !== "started" || !hostId) return;
    if (drawing) return;
    setDrawing(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) setRoom(data.room);
      }
    } finally {
      setDrawing(false);
    }
  };

  const toggleTicketNumber = (ticketIndex: number, num: number) => {
    setSelectedByTicket((prev) => {
      const set = new Set(prev[ticketIndex] ?? []);
      if (set.has(num)) set.delete(num);
      else set.add(num);
      return { ...prev, [ticketIndex]: set };
    });
    setClaimError("");
  };

  const handleClaimJaldiFive = async (ticketIndex: number) => {
    const numbers = selectedByTicket[ticketIndex];
    if (!numbers || numbers.size !== 5) return;
    const numList = Array.from(numbers);
    const myName = room?.players.find((p) => p.id === myId)?.name ?? (isHost ? "Host" : "Player");
    if (!myId) return;
    setClaimError("");
    setClaiming(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/claim/jaldi-five`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: myId, playerName: myName, numbers: numList }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.room) {
        setRoom(data.room);
      } else {
        setClaimError(data.error ?? "Claim failed");
      }
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    if (!code) return;
    setLink(
      typeof window !== "undefined"
        ? `${window.location.origin}/join?code=${code}`
        : ""
    );
  }, [code]);

  useEffect(() => {
    if (!code) return;

    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`);
        if (!res.ok) {
          setError("Room not found");
          setRoom(null);
          return;
        }
        const data = await res.json();
        setRoom(data);
        setError("");
      } catch {
        setError("Failed to load room");
        setRoom(null);
      }
    };

    fetchRoom();
  }, [code]);

  // Socket.IO: connect once, join room by code, listen for "room" — host and all players get same updates
  useEffect(() => {
    if (!code || typeof window === "undefined") return;

    const roomCode = String(code).toUpperCase();
    // Socket server runs on a separate port (e.g. 3001); set NEXT_PUBLIC_SOCKET_URL if different
    const socketUrl =
      (process.env.NEXT_PUBLIC_SOCKET_URL as string) || "http://localhost:3001";
    if (!socketUrl) return;

    const socket = io(socketUrl, {
      path: "/socket.io",
      autoConnect: true,
    });
    socketRef.current = socket;

    const joinRoom = () => {
      socket.emit("join_room", { roomCode });
    };
    const onConnect = () => {
      setLive(true);
      joinRoom();
    };
    const onDisconnect = () => setLive(false);
    const onRoom = (data: RoomState) => setRoom(data);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room", onRoom);

    if (socket.connected) {
      setLive(true);
      joinRoom();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room", onRoom);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code]);

  if (error && !room) {
    return (
      <div className="min-h-screen bg-neutral-100 px-4 py-8">
        <p className="text-red-600">{error}</p>
        <Link href="/" className="mt-4 inline-block text-neutral-600 underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <p className="text-neutral-600">Loading room…</p>
      </div>
    );
  }

  const totalTickets = room.totalTickets ?? room.players.reduce((s, p) => s + p.ticketCount, 0);
  const totalAmount = room.totalAmount ?? totalTickets * room.ticketPrice;

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="border-b border-neutral-300 bg-white px-4 py-3">
        {canQuitAsPlayer ? (
          <button
            type="button"
            onClick={handleGoHome}
            disabled={leaving}
            className="text-neutral-600 hover:text-neutral-800 disabled:opacity-50"
          >
            {leaving ? "Leaving…" : "← Home"}
          </button>
        ) : (
          <Link href="/" className="text-neutral-600 hover:text-neutral-800">
            ← Home
          </Link>
        )}
        {leaveError && (
          <p className="mt-2 text-sm text-red-600">{leaveError}</p>
        )}
        <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-semibold text-neutral-800">
            Room {room.code}
          </h1>
          <div className="flex items-center gap-2">
            {isHost && (
              <span className="rounded bg-neutral-200 px-2 py-0.5 text-sm text-neutral-700">
                Host
              </span>
            )}
            <span
              className={`rounded px-2 py-0.5 text-sm ${
                live ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
              }`}
              title={live ? "Real-time updates on" : "Connecting…"}
            >
              {live ? "Live" : "…"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {room.status === "waiting" && (
          <>
            <section className="rounded-lg border border-neutral-300 bg-white p-4">
              <p className="text-sm text-neutral-600">Ticket price</p>
              <p className="text-lg font-semibold">₹{room.ticketPrice} per ticket</p>
            </section>

            {isHost && link && (
              <section className="rounded-lg border border-neutral-300 bg-white p-4">
                <p className="text-sm font-medium text-neutral-700 mb-2">
                  Share this link
                </p>
                <p className="text-sm text-neutral-600 break-all select-all">
                  {link}
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  Or share the code: <strong>{room.code}</strong>
                </p>
              </section>
            )}

            <section className="rounded-lg border border-neutral-300 bg-white p-4">
              <h2 className="font-medium text-neutral-800 mb-2">Players</h2>
              <ul className="space-y-2">
                {room.players.map((p) => (
                  <li
                    key={p.id}
                    className="flex justify-between text-sm"
                  >
                    <span>
                      {p.name}
                      {p.id === room.hostId && " (Host)"}
                    </span>
                    <span>{p.ticketCount} ticket{p.ticketCount !== 1 ? "s" : ""}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-neutral-300 bg-white p-4">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Total tickets</span>
                <span className="font-medium">{totalTickets}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-neutral-600">Total amount</span>
                <span className="font-medium">₹{totalAmount}</span>
              </div>
            </section>
          </>
        )}

        {room.status === "waiting" && isHost && (
          <div className="flex flex-col gap-3 items-center">
            <button
              type="button"
              onClick={handleStartGame}
              disabled={starting}
              className="rounded-lg border-2 border-green-600 bg-green-600 px-6 py-3 text-base font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {starting ? "Starting…" : "Start game"}
            </button>
            <button
              type="button"
              onClick={handleEndGame}
              disabled={ending}
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
            >
              {ending ? "Ending…" : "End game"}
            </button>
          </div>
        )}

        {room.status === "started" && (
          <GameScreen
            room={room}
            isHost={isHost}
            myId={myId ?? ""}
            drawing={drawing}
            onDrawNumber={handleDrawNumber}
            selectedByTicket={selectedByTicket}
            onToggleNumber={toggleTicketNumber}
            claiming={claiming}
            claimError={claimError}
            onClaimJaldiFive={handleClaimJaldiFive}
          />
        )}
      </main>
    </div>
  );
}

function GameScreen({
  room,
  isHost,
  myId,
  drawing,
  onDrawNumber,
  selectedByTicket,
  onToggleNumber,
  claiming,
  claimError,
  onClaimJaldiFive,
}: {
  room: RoomState;
  isHost: boolean;
  myId: string;
  drawing: boolean;
  onDrawNumber: () => void;
  selectedByTicket: Record<number, Set<number>>;
  onToggleNumber: (ticketIndex: number, num: number) => void;
  claiming: boolean;
  claimError: string;
  onClaimJaldiFive: (ticketIndex: number) => void;
}) {
  const tickets = (room.playerTickets && myId ? room.playerTickets[myId] : null) ?? [];
  const drawn = room.drawnNumbers ?? [];
  const currentNumber = drawn.length > 0 ? drawn[drawn.length - 1]! : null;
  const drawnSet = new Set(drawn);

  return (
    <div className="space-y-6">
      {/* Current number: display for all; host also gets Pick next button */}
      <section className="rounded-lg border-2 border-neutral-400 bg-white p-6 text-center">
        <p className="text-sm font-medium text-neutral-600 mb-1">Current number</p>
        {isHost ? (
          <div className="flex flex-col gap-3 items-center">
            <p className="text-4xl font-bold text-neutral-900">
              {currentNumber ?? "—"}
            </p>
            <button
              type="button"
              onClick={onDrawNumber}
              disabled={drawing || drawn.length >= 90}
              className="rounded-lg bg-green-600 px-6 py-2 text-white font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {drawing ? "Drawing…" : "Pick next number"}
            </button>
          </div>
        ) : (
          <p className="text-4xl font-bold text-neutral-900">
            {currentNumber ?? "—"}
          </p>
        )}
      </section>

      {room.jaldiFiveClaimed && (
        <section className="rounded-lg border border-green-500 bg-green-50 p-4 text-center">
          <p className="font-medium text-green-800">
            Jaldi Five claimed by {room.jaldiFiveClaimed.playerName}!
          </p>
        </section>
      )}

      {claimError && (
        <p className="text-sm text-red-600 text-center">{claimError}</p>
      )}

      {/* My tickets */}
      <section>
        <h2 className="font-medium text-neutral-800 mb-3">My tickets</h2>
        <div className="space-y-6">
          {tickets.length === 0 ? (
            <p className="text-neutral-500 text-sm">No tickets.</p>
          ) : (
            tickets.map((ticket, ticketIndex) => {
              const selected = selectedByTicket[ticketIndex] ?? new Set();
              const selectedList = Array.from(selected);
              const allFiveDrawn = selectedList.length === 5 && selectedList.every((n) => drawnSet.has(n));
              const canClaim = allFiveDrawn && !room.jaldiFiveClaimed;
              return (
                <div key={ticketIndex} className="relative rounded-lg border border-neutral-300 bg-white p-3">
                  <p className="text-xs text-neutral-500 mb-2">Ticket {ticketIndex + 1}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-center" style={{ minWidth: 280 }}>
                      <tbody>
                        {ticket.map((row, r) => (
                          <tr key={r}>
                            {row.map((cell, c) => {
                              const num = cell;
                              const isDrawn = num !== null && drawnSet.has(num);
                              const isSelected = num !== null && selected.has(num);
                              return (
                                <td
                                  key={c}
                                  className={`border border-neutral-300 p-1 w-8 h-9 text-sm select-none ${
                                    num === null
                                      ? "bg-neutral-100"
                                      : isSelected
                                        ? "bg-green-400 text-white font-medium"
                                        : isDrawn
                                          ? "bg-green-100"
                                          : "bg-white hover:bg-neutral-100 cursor-pointer"
                                  }`}
                                  onClick={() => num !== null && onToggleNumber(ticketIndex, num)}
                                  role={num !== null ? "button" : undefined}
                                >
                                  {num ?? ""}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {canClaim && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                      <button
                        type="button"
                        onClick={() => onClaimJaldiFive(ticketIndex)}
                        disabled={claiming}
                        className="rounded-lg bg-green-600 px-6 py-3 text-white font-medium shadow-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {claiming ? "Claiming…" : "Claim Jaldi Five"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
