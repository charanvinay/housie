"use client";

import { Button } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { useModal } from "@/components/Modal";
import { getClaimPrizeAmounts } from "@/lib/rooms";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiCopy, FiShare2, FiUser } from "react-icons/fi";
import { PiUserCircleCheckFill, PiUserCircleDashedFill } from "react-icons/pi";
import { io, Socket } from "socket.io-client";
import { GameEndedNoWinners } from "./GameEndedNoWinners";
import { GameScreen } from "./GameScreen";
import { WinnersScreen } from "./WinnersScreen";
import {
  clearRoomSession,
  clearSelectionsForRoom,
  getAllNumbersInTicket,
  getNumbersInRow,
  loadSelections,
  saveRoomSession,
  saveSelections,
} from "./room-utils";
import type { RoomState, TicketGrid } from "./types";

function RoomPageInner() {
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
  const [linkCopied, setLinkCopied] = useState(false);
  const [live, setLive] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  /** Per-ticket selected numbers (ticketIndex -> Set of numbers) for Jaldi Five */
  const [selectedByTicket, setSelectedByTicket] = useState<
    Record<number, Set<number>>
  >({});
  const socketRef = useRef<Socket | null>(null);
  const selectionsLoadedRef = useRef(false);

  const isHost = Boolean(hostId && room?.hostId === hostId);
  const myId = isHost ? hostId : playerId;
  const canQuitAsPlayer = !isHost && playerId && room?.status === "waiting";
  const modal = useModal();

  // Persist this tab’s room context so "/" can redirect back (per-tab via sessionStorage)
  useEffect(() => {
    if (!code || !room) return;
    if (hostId && room.hostId === hostId) {
      saveRoomSession(code, "host", hostId);
    } else if (playerId && room.players.some((p) => p.id === playerId)) {
      saveRoomSession(code, "player", playerId);
    }
  }, [code, room, hostId, playerId]);

  // When game is ended we show the winners screen; user clicks "Back to home" to leave

  // Load persisted selections once when game is started (e.g. after refresh)
  useEffect(() => {
    if (room?.status !== "started") {
      selectionsLoadedRef.current = false;
      return;
    }
    if (!code || !myId || selectionsLoadedRef.current) return;
    const loaded = loadSelections(code, myId);
    if (Object.keys(loaded).length > 0) {
      setSelectedByTicket((prev) => {
        const next = { ...prev };
        for (const [k, set] of Object.entries(loaded)) {
          const idx = parseInt(k, 10);
          if (!Number.isNaN(idx) && set.size) next[idx] = set;
        }
        return next;
      });
    }
    selectionsLoadedRef.current = true;
  }, [code, myId, room?.status]);

  useEffect(() => {
    if (!code || !myId || room?.status !== "started") return;
    saveSelections(code, myId, selectedByTicket);
  }, [code, myId, room?.status, selectedByTicket]);

  const handleGoHome = async (e?: React.MouseEvent) => {
    if (!canQuitAsPlayer) return;
    e?.preventDefault();
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
    if (!isHost || !hostId) return;
    if (room?.status !== "waiting" && room?.status !== "started") return;
    if (ending) return;
    setEnding(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEnding(false);
        return;
      }
      if (data.room) {
        setRoom(data.room);
      } else {
        clearRoomSession();
        router.push("/");
      }
    } catch {
      setEnding(false);
    } finally {
      setEnding(false);
    }
  };

  const handleStartGame = async () => {
    if (!isHost || room?.status !== "waiting" || !hostId) return;
    if (!live) return;
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
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.room) {
        setRoom(data.room);
      } else if (!res.ok && data.room) {
        setRoom(data.room);
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

  const myName =
    room?.players.find((p) => p.id === myId)?.name ??
    (isHost ? "Host" : "Player");

  type ClaimType =
    | "jaldiFive"
    | "firstLine"
    | "middleLine"
    | "lastLine"
    | "housie";

  const addClaimedNumbersToSelection = (
    ticketIndex: number,
    types: ClaimType[],
    ticket: TicketGrid,
    jaldiFiveNums?: number[]
  ) => {
    const toAdd = new Set<number>();
    if (types.includes("firstLine"))
      getNumbersInRow(ticket, 0).forEach((n) => toAdd.add(n));
    if (types.includes("middleLine"))
      getNumbersInRow(ticket, 1).forEach((n) => toAdd.add(n));
    if (types.includes("lastLine"))
      getNumbersInRow(ticket, 2).forEach((n) => toAdd.add(n));
    if (types.includes("jaldiFive") && jaldiFiveNums?.length === 5)
      jaldiFiveNums.forEach((n) => toAdd.add(n));
    if (types.includes("housie"))
      getAllNumbersInTicket(ticket).forEach((n) => toAdd.add(n));
    if (toAdd.size === 0) return;
    setSelectedByTicket((prev) => {
      const next = { ...prev };
      const existing = next[ticketIndex] ?? new Set();
      next[ticketIndex] = new Set([...existing, ...toAdd]);
      return next;
    });
  };

  const handleClaim = async (
    ticketIndex: number,
    claimTypes: ClaimType[],
    jaldiFiveNumbers?: number[]
  ) => {
    if (!myId || !room || claimTypes.length === 0) return;
    const ticket = room.playerTickets?.[myId]?.[ticketIndex];
    if (!ticket) return;
    if (
      claimTypes.includes("jaldiFive") &&
      (!jaldiFiveNumbers || jaldiFiveNumbers.length !== 5)
    )
      return;

    setClaimError("");
    setClaiming(true);
    try {
      if (claimTypes.length === 1) {
        const path =
          claimTypes[0] === "jaldiFive"
            ? "jaldi-five"
            : claimTypes[0] === "firstLine"
            ? "first-line"
            : claimTypes[0] === "middleLine"
            ? "middle-line"
            : claimTypes[0] === "lastLine"
            ? "last-line"
            : "housie";
        const body: Record<string, unknown> = {
          playerId: myId,
          playerName: myName,
          ticketIndex,
        };
        if (claimTypes[0] === "jaldiFive") body.numbers = jaldiFiveNumbers;
        const res = await fetch(
          `/api/rooms/${encodeURIComponent(code)}/claim/${path}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.room) {
          setRoom(data.room);
          addClaimedNumbersToSelection(
            ticketIndex,
            claimTypes,
            data.room.playerTickets?.[myId]?.[ticketIndex] ?? ticket,
            jaldiFiveNumbers
          );
        } else {
          setClaimError(data.error ?? "Claim failed");
        }
      } else {
        const res = await fetch(
          `/api/rooms/${encodeURIComponent(code)}/claim/multiple`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playerId: myId,
              playerName: myName,
              ticketIndex,
              claimTypes,
              jaldiFiveNumbers: claimTypes.includes("jaldiFive")
                ? jaldiFiveNumbers
                : undefined,
            }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.room) {
          setRoom(data.room);
          addClaimedNumbersToSelection(
            ticketIndex,
            claimTypes,
            data.room.playerTickets?.[myId]?.[ticketIndex] ?? ticket,
            jaldiFiveNumbers
          );
        } else {
          setClaimError(data.error ?? "Claim failed");
        }
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
    const onRoom = (data: RoomState) => {
      setRoom((prev) => {
        if (!prev) return data;
        const prevDrawn = prev.drawnNumbers?.length ?? 0;
        const nextDrawn = data.drawnNumbers?.length ?? 0;
        if (data.status === "ended") return data;
        if (nextDrawn < prevDrawn) return prev;
        return data;
      });
    };

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
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="room-card max-w-sm w-full text-center">
          <p className="form-error">{error}</p>
          <div className="mt-4">
            <Button href="/" variant="secondary">
              Back to home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="room-card max-w-sm text-center">
          <p className="text-theme-primary">Loading room…</p>
        </div>
      </div>
    );
  }

  const totalTickets =
    room.totalTickets ?? room.players.reduce((s, p) => s + p.ticketCount, 0);
  const totalAmount = room.totalAmount ?? totalTickets * room.ticketPrice;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6">
      {room.status === "waiting" ? (
        <main className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center">
          <div className="w-full rounded-2xl p-4 md:p-8 shadow-2xl bg-roomCard border-2 border-yellow/80">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
              {/* Left card: header actions + joining players */}
              <div className="order-1 room-card flex flex-col">
                <div className="flex flex-row items-center gap-3 mb-4">
                  {canQuitAsPlayer ? (
                    <IconButton
                      type="button"
                      onClick={() => handleGoHome()}
                      disabled={leaving}
                      icon={<FiChevronLeft className="size-5 shrink-0" />}
                      aria-label="Leave room"
                    />
                  ) : isHost ? (
                    <IconButton
                      type="button"
                      onClick={() =>
                        modal.info({
                          title: "Are you sure you want to exit?",
                          description: "This will end the game.",
                          onOk: handleEndGame,
                          onCancel: () => {},
                          okText: "Yes",
                          cancelText: "No",
                        })
                      }
                      icon={<FiChevronLeft className="size-5 shrink-0" />}
                      aria-label="Back (exit and end game)"
                    />
                  ) : (
                    <IconButton
                      href="/"
                      icon={<FiChevronLeft className="size-5 shrink-0" />}
                      aria-label="Back to home"
                    />
                  )}
                  <h1 className="flex-1 text-xl font-semibold text-theme-primary text-center">
                    Room {room.code}
                  </h1>
                  <div className="flex items-center gap-2 w-10 justify-end">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        live
                          ? "bg-successBg text-success"
                          : "bg-theme-accent-soft text-theme-muted"
                      }`}
                      title={live ? "Real-time updates on" : "Connecting…"}
                    >
                      {live ? "Live" : "…"}
                    </span>
                  </div>
                </div>
                {leaveError && <p className="form-error mb-3">{leaveError}</p>}
                <h2 className="form-label mb-2">Joining players</h2>
                <ul className="space-y-4 flex-1 rounded-lg p-3 border-2 border-accent/30 bg-inputBg max-h-52 md:max-h-full overflow-scroll">
                  {room.players.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 text-sm text-theme-primary"
                    >
                      {p.id === room.hostId ? (
                        <PiUserCircleCheckFill className="size-7 text-yellow" />
                      ) : (
                        <PiUserCircleDashedFill className="size-7 text-accent/90" />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {p.name}
                        {p.id === room.hostId && (
                          <span className="ml-1 text-yellow text-xs font-semibold">
                            (Host)
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 font-medium text-theme-accent">
                        {p.ticketCount} ticket{p.ticketCount !== 1 ? "s" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right card: game details + prize split + share + start/end */}
              <div className="order-2 room-card space-y-6 border-t border-accent/30 md:border-l md:border-t-0 border-dashed pt-6 md:pl-10 md:pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <section>
                    <p className="form-label">Ticket price</p>
                    <p className="text-xl font-bold text-theme-accent">
                      ₹{room.ticketPrice} per ticket
                    </p>
                  </section>
                  <section>
                    <div className="flex justify-between text-sm">
                      <span className="form-label mb-0">Total tickets</span>
                      <span className="font-semibold text-theme-primary">
                        {totalTickets}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-theme-muted">Total amount</span>
                      <span className="font-semibold text-theme-accent">
                        ₹{totalAmount}
                      </span>
                    </div>
                  </section>
                </div>

                {totalAmount > 0 &&
                  (() => {
                    const prizes = getClaimPrizeAmounts(totalAmount);
                    const rows: { label: string; amount: number }[] = [
                      { label: "Jaldi Five", amount: prizes.jaldiFive },
                      { label: "First line", amount: prizes.firstLine },
                      { label: "Middle line", amount: prizes.middleLine },
                      { label: "Last line", amount: prizes.lastLine },
                      { label: "Housie", amount: prizes.housie },
                    ];
                    return (
                      <section>
                        <h2 className="form-label mb-2">Prize split</h2>
                        <p className="text-xs text-theme-muted mb-2">
                          Split equally when multiple winners for the same
                          claim.{" "}
                          {Math.min(
                            prizes.jaldiFive,
                            prizes.firstLine,
                            prizes.housie
                          ) < 5
                            ? "Small pool: amounts in multiples of ₹2."
                            : "Minimum ₹5 per claim."}
                        </p>
                        <div className="rounded-lg p-4 border-2 border-accent/30 bg-inputBg">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b-2 border-[#93c5fd]/60">
                                <th className="text-left py-2 font-semibold text-theme-primary">
                                  Claim type
                                </th>
                                <th className="text-right py-2 font-semibold text-theme-primary">
                                  Amount
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map(({ label, amount }, index) => (
                                <tr
                                  key={label}
                                  className={`border-b border-[#93c5fd]/40 ${
                                    index === rows.length - 1
                                      ? "border-b-0"
                                      : ""
                                  }`}
                                >
                                  <td className="py-2 text-theme-primary">
                                    {label}
                                  </td>
                                  <td className="py-2 text-right font-semibold text-yellow">
                                    ₹{amount}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    );
                  })()}

                {isHost && link && (
                  <section>
                    <p className="form-label mb-2">Share this link</p>
                    <p className="text-sm text-theme-primary break-all rounded-lg border-2 border-accent/30 bg-inputBg px-3 py-2">
                      {link}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(link);
                            setLinkCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                          } catch {
                            setLinkCopied(false);
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border-2 border-accent/30 bg-inputBg px-3 py-2 text-sm text-theme-primary hover:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/50"
                        title="Copy link"
                      >
                        <FiCopy className="size-4 shrink-0" />
                        {linkCopied ? "Copied!" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            if (navigator.share) {
                              await navigator.share({
                                title: `Room ${room.code}`,
                                text: `Join Housie room ${room.code}`,
                                url: link,
                              });
                            } else {
                              await navigator.clipboard.writeText(link);
                              setLinkCopied(true);
                              setTimeout(() => setLinkCopied(false), 2000);
                            }
                          } catch {
                            // user cancelled or share failed
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border-2 border-accent/30 bg-inputBg px-3 py-2 text-sm text-theme-primary hover:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/50"
                        title="Share link"
                      >
                        <FiShare2 className="size-4 shrink-0" />
                        Share
                      </button>
                    </div>
                  </section>
                )}

                {isHost && (
                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      type="button"
                      variant="yellow"
                      onClick={handleStartGame}
                      disabled={starting || !live}
                    >
                      {starting ? "Starting…" : "Start game"}
                    </Button>
                    {!live && (
                      <p className="text-xs text-theme-muted text-center">
                        Start game is available when the connection is live.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      ) : (
        <>
          <header className="shrink-0 flex items-center gap-3 px-2 py-2 max-w-4xl mx-auto w-full">
            {canQuitAsPlayer ? (
              <IconButton
                type="button"
                onClick={() => handleGoHome()}
                disabled={leaving}
                icon={<FiChevronLeft className="size-5 shrink-0" />}
                aria-label="Leave room"
              />
            ) : isHost ? (
              <IconButton
                type="button"
                onClick={() =>
                  modal.info({
                    title: "Are you sure you want to exit?",
                    description: "This will end the game.",
                    onOk: handleEndGame,
                    onCancel: () => {},
                    okText: "Yes",
                    cancelText: "No",
                  })
                }
                icon={<FiChevronLeft className="size-5 shrink-0" />}
                aria-label="Back (exit and end game)"
              />
            ) : (
              <IconButton
                href="/"
                icon={<FiChevronLeft className="size-5 shrink-0" />}
                aria-label="Back to home"
              />
            )}
            <h1 className="flex-1 text-lg font-semibold text-white drop-shadow-sm">
              Room {room.code}
            </h1>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                live ? "bg-green-400/90 text-white" : "bg-white/20 text-white"
              }`}
            >
              {live ? "Live" : "…"}
            </span>
          </header>

          <main className="mx-auto w-full max-w-4xl flex-1 px-0 py-4">
            {room.status === "started" && (
              <div className="mx-auto max-w-lg space-y-6">
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
                  onClaim={handleClaim}
                />
              </div>
            )}

            {room.status === "ended" && (
              <div className="mx-auto max-w-lg space-y-6">
                {(room.drawnNumbers?.length ?? 0) > 0 ||
                room.jaldiFiveClaimed?.length ||
                room.firstLineClaimed?.length ||
                room.middleLineClaimed?.length ||
                room.lastLineClaimed?.length ||
                room.housieClaimed?.length ? (
                  <WinnersScreen
                    room={room}
                    onBackHome={() => {
                      clearRoomSession();
                      if (myId) clearSelectionsForRoom(code, myId);
                      router.push("/");
                    }}
                  />
                ) : (
                  <GameEndedNoWinners
                    onBackHome={() => {
                      clearRoomSession();
                      if (myId) clearSelectionsForRoom(code, myId);
                      router.push("/");
                    }}
                  />
                )}
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}

export default RoomPageInner;
