"use client";

import { Button } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { MobilePortraitGameWrap } from "@/components/MobilePortraitGameWrap";
import { useModal } from "@/components/Modal";
import { RotateToLandscape } from "@/components/RotateToLandscape";
import { LiveIndicator } from "@/components/LiveIndicator";
import { useToast } from "@/components/Toast";
import { getClaimPrizeAmounts } from "@/lib/rooms";
import { motion } from "framer-motion";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiCopy, FiRefreshCw, FiShare2 } from "react-icons/fi";
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
  /** When host starts a draw; server broadcasts draw_started so all clients can play coin sound in sync */
  const [drawStartedAt, setDrawStartedAt] = useState<number | null>(null);
  /** Per-ticket selected numbers (ticketIndex -> Set of numbers) for Jaldi Five */
  const [selectedByTicket, setSelectedByTicket] = useState<
    Record<number, Set<number>>
  >({});
  const socketRef = useRef<Socket | null>(null);
  const selectionsLoadedRef = useRef(false);
  const hasRefetchedForStartedRef = useRef(false);
  const gameEndedWithWinnersSoundPlayedRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isHost = Boolean(hostId && room?.hostId === hostId);
  const myId = isHost ? hostId : playerId;
  const canQuitAsPlayer = !isHost && playerId && room?.status === "waiting";
  const modal = useModal();
  const toast = useToast();

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

  /** Called when host clicks "Pick next number"; emits draw_started so all clients (including host) get it via socket and play coin sound */
  const handleDrawStarted = () => {
    if (!code) return;
    socketRef.current?.emit("draw_started", {
      roomCode: String(code).toUpperCase(),
    });
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
          socketRef.current?.emit("claim_made", {
            roomCode: String(code).toUpperCase(),
            claimerId: myId,
          });
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
          socketRef.current?.emit("claim_made", {
            roomCode: String(code).toUpperCase(),
            claimerId: myId,
          });
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
          setError(
            "This room may have been closed or the code might be incorrect. Please check the code and try again."
          );
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

    const onDrawStarted = () => setDrawStartedAt(Date.now());
    const onClaimMade = (payload: { claimerId?: string }) => {
      if (payload.claimerId !== myId) {
        new Audio("/fahh.mp3").play().catch(() => {});
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room", onRoom);
    socket.on("draw_started", onDrawStarted);
    socket.on("claim_made", onClaimMade);

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
      socket.off("draw_started", onDrawStarted);
      socket.off("claim_made", onClaimMade);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, myId ?? ""]);

  // Play cat-laugh once when game really ends with winners (WinnersScreen is shown)
  const hasWinners =
    room?.status === "ended" &&
    ((room.drawnNumbers?.length ?? 0) > 0 ||
      !!room.jaldiFiveClaimed?.length ||
      !!room.firstLineClaimed?.length ||
      !!room.middleLineClaimed?.length ||
      !!room.lastLineClaimed?.length ||
      !!room.housieClaimed?.length);
  useEffect(() => {
    if (room?.status !== "ended") {
      gameEndedWithWinnersSoundPlayedRef.current = false;
      return;
    }
    if (!hasWinners || gameEndedWithWinnersSoundPlayedRef.current) return;
    gameEndedWithWinnersSoundPlayedRef.current = true;
    const audio = new Audio("/cat-laugh.mp3");
    audio.play().catch(() => {});
  }, [room?.status, hasWinners]);

  // Refetch room when game starts so production always has latest state (avoids stuck waiting screen)
  useEffect(() => {
    if (room?.status !== "started") {
      hasRefetchedForStartedRef.current = false;
      return;
    }
    if (hasRefetchedForStartedRef.current || !code) return;
    hasRefetchedForStartedRef.current = true;
    fetch(`/api/rooms/${encodeURIComponent(code)}`)
      .then((res) => {
        if (!res.ok) return;
        return res.json();
      })
      .then((data) => {
        if (data) setRoom(data);
      })
      .catch(() => {});
  }, [code, room?.status]);

  const handleSoftRefresh = async () => {
    if (!code || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`);
      if (!res.ok) {
        setError(
          "This room may have been closed or the code might be incorrect. Please check the code and try again."
        );
        setRoom(null);
        return;
      }
      const data = await res.json();
      setRoom(data);
      setError("");
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit("join_room", { roomCode: String(code).toUpperCase() });
      }
      toast.show("Reloaded Successfully", "success");
    } catch {
      setError("Failed to load room");
      setRoom(null);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (error && !room) {
    return (
      <div className="min-h-screen-safe flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ y: 32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "tween", duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-xl rounded-2xl p-8 md:p-10 bg-roomCard border-2 border-yellow/80 shadow-roomCardInner"
        >
          <h2 className="text-xl font-bold text-theme-primary text-center mb-2">
            Room not found
          </h2>
          <p className="text-sm text-theme-muted text-center mb-6">{error}</p>
          <div className="pt-2 text-center">
            <Button href="/" variant="primary">
              Back to home
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!room) {
    return <LoadingOverlay />;
  }

  const totalTickets =
    room.totalTickets ?? room.players.reduce((s, p) => s + p.ticketCount, 0);
  const totalAmount = room.totalAmount ?? totalTickets * room.ticketPrice;

  return (
    <div
      className={
        room.status === "waiting"
          ? "relative min-h-screen-safe flex flex-col items-center justify-center px-4 py-6"
          : "relative h-screen-safe flex flex-col overflow-hidden"
      }
    >
      {room.status === "waiting" ? (
        <main className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center">
          <motion.div
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "tween", duration: 0.35, ease: "easeOut" }}
            className="w-full rounded-2xl p-6 md:p-8 bg-roomCard border-2 border-yellow/80 shadow-roomCardInner grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10"
          >
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
                <div className="flex items-center gap-2 justify-end">
                  <LiveIndicator live={live} />
                  <IconButton
                    type="button"
                    onClick={handleSoftRefresh}
                    icon={<FiRefreshCw className="size-5 shrink-0" />}
                    aria-label="Reload page"
                  />
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
                        Split equally when multiple winners for the same claim.{" "}
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
                                  index === rows.length - 1 ? "border-b-0" : ""
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
                  <p className="form-label mb-2">
                    Invite players — share this link
                  </p>
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
                              title: "Housie Time! 🥳",
                              text: `Come join our Housie game! Use room code ${room.code} and let's enjoy together 😊`,
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
          </motion.div>
        </main>
      ) : (
        <RotateToLandscape active={room.status === "started"}>
          <div className="flex-1 min-h-0 flex flex-col w-full overflow-hidden p-4">
            <header className="shrink-0 grid grid-cols-3 items-center px-2 py-2 w-full gap-4">
              {/* Left: back + room name */}
              <div className="flex items-center gap-3 shrink-0">
                {canQuitAsPlayer ? (
                  <IconButton
                    type="button"
                    onClick={() => handleGoHome()}
                    disabled={leaving}
                    icon={<FiChevronLeft className="size-5 shrink-0" />}
                    aria-label="Leave room"
                  />
                ) : isHost && room.status === "ended" ? (
                  <IconButton
                    type="button"
                    onClick={() => {
                      clearRoomSession();
                      if (myId) clearSelectionsForRoom(code, myId);
                      router.push("/");
                    }}
                    icon={<FiChevronLeft className="size-5 shrink-0" />}
                    aria-label="Back to home"
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
                <h1 className="text-lg font-semibold text-white drop-shadow-sm">
                  Room {room.code}
                </h1>
              </div>
              {/* Center: claims — only when game is waiting or started */}
              {room.status !== "ended" && (
                <div className="flex flex-1 justify-center items-start gap-5 min-w-0">
                  {(
                    [
                      {
                        key: "jaldiFive",
                        label: "J5",
                        entries: room.jaldiFiveClaimed,
                      },
                      {
                        key: "firstLine",
                        label: "FL",
                        entries: room.firstLineClaimed,
                      },
                      {
                        key: "middleLine",
                        label: "ML",
                        entries: room.middleLineClaimed,
                      },
                      {
                        key: "lastLine",
                        label: "LL",
                        entries: room.lastLineClaimed,
                      },
                      { key: "housie", label: "H", entries: room.housieClaimed },
                    ] as const
                  ).map(({ key, label, entries }) => {
                    const claimed = (entries?.length ?? 0) > 0;
                    return (
                      <div
                        key={key}
                        className="flex flex-col items-center gap-0.5 shrink-0"
                      >
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold ${
                            claimed
                              ? "border-yellow bg-yellow/20 text-yellow"
                              : "border-slate-500 bg-slate-700/50 text-slate-400"
                          }`}
                        >
                          {label}
                        </div>
                        {claimed && entries?.length ? (
                          <span className="text-center text-[10px] text-yellow font-semibold">
                            {entries.map((e) => e.playerName).join(", ")}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Right: Live + Reload */}
              <div className="flex items-center gap-2 shrink-0 place-self-end self-start">
                <LiveIndicator
                  live={live}
                  className={!live ? "text-white/70!" : undefined}
                />
                <IconButton
                  type="button"
                  onClick={handleSoftRefresh}
                  icon={<FiRefreshCw className="size-5 shrink-0" />}
                  aria-label="Reload page"
                />
              </div>
            </header>

            <main
              key={room.status}
              className="w-full flex-1 min-h-0 px-0 py-4 flex flex-col"
            >
              {room.status === "started" && (
                <div className="w-full flex-1 min-h-0 px-2 md:px-4 flex flex-col overflow-hidden">
                  <MobilePortraitGameWrap>
                    <GameScreen
                      room={room}
                      isHost={isHost}
                      myId={myId ?? ""}
                      drawing={drawing}
                      drawStartedAt={drawStartedAt}
                      onDrawStarted={handleDrawStarted}
                      onDrawNumber={handleDrawNumber}
                      selectedByTicket={selectedByTicket}
                      onToggleNumber={toggleTicketNumber}
                      claiming={claiming}
                      claimError={claimError}
                      onClaim={handleClaim}
                    />
                  </MobilePortraitGameWrap>
                </div>
              )}

              {room.status === "ended" && (
                <div className="flex flex-1 flex-col items-center justify-center w-full px-4">
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
          </div>
        </RotateToLandscape>
      )}
      {isRefreshing && <LoadingOverlay />}
    </div>
  );
}

export default RoomPageInner;
