"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

type Player = {
  id: string;
  name: string;
  ticketCount: number;
};

type RoomState = {
  code: string;
  ticketPrice: number;
  hostId: string;
  players: Player[];
  status: string;
  totalTickets?: number;
  totalAmount?: number;
};

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const hostId = searchParams.get("hostId");
  const playerId = searchParams.get("playerId");

  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [live, setLive] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const isHost = Boolean(hostId && room?.hostId === hostId);

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
        <Link href="/" className="text-neutral-600 hover:text-neutral-800">
          ← Home
        </Link>
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

        {room.status === "waiting" && isHost && (
          <p className="text-sm text-neutral-500 text-center">
            Start game button can be added next (when you implement game start).
          </p>
        )}
      </main>
    </div>
  );
}
