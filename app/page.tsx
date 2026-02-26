"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ROOM_SESSION_KEY = "housie_room";

type RoomSession = { code: string; role: "host" | "player"; id: string };

/** One active room per browser (localStorage so all tabs share). */
function getRoomSession(): RoomSession | null {
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
      "id" in data &&
      typeof (data as RoomSession).code === "string" &&
      ((data as RoomSession).role === "host" || (data as RoomSession).role === "player") &&
      typeof (data as RoomSession).id === "string"
    ) {
      return data as RoomSession;
    }
  } catch {}
  return null;
}

function clearRoomSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ROOM_SESSION_KEY);
    sessionStorage.removeItem(ROOM_SESSION_KEY);
  } catch {}
}

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const session = getRoomSession();
    if (!session) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/rooms/${encodeURIComponent(session.code)}`)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          clearRoomSession();
          setChecking(false);
          return;
        }
        return res.json();
      })
      .then((room) => {
        if (cancelled || !room) {
          setChecking(false);
          return;
        }
        if (room.status === "ended") {
          clearRoomSession();
          setChecking(false);
          return;
        }
        if (session.role === "host" && room.hostId === session.id) {
          router.replace(`/room/${room.code}?hostId=${encodeURIComponent(session.id)}`);
          return;
        }
        if (session.role === "player" && Array.isArray(room.players)) {
          const inRoom = room.players.some((p: { id: string }) => p.id === session.id);
          if (inRoom) {
            router.replace(`/room/${room.code}?playerId=${encodeURIComponent(session.id)}`);
            return;
          }
        }
        clearRoomSession();
        setChecking(false);
      })
      .catch(() => setChecking(false));

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col">
        <header className="border-b border-neutral-300 bg-white px-4 py-3">
          <h1 className="text-xl font-semibold text-neutral-800">Tambola</h1>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <p className="text-neutral-600">Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      <header className="border-b border-neutral-300 bg-white px-4 py-3">
        <h1 className="text-xl font-semibold text-neutral-800">Tambola</h1>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/create"
            className="rounded-lg border-2 border-neutral-400 bg-white px-8 py-6 text-center font-medium text-neutral-800 shadow-sm hover:border-neutral-500 hover:bg-neutral-50 transition-colors"
          >
            Create room
          </Link>
          <Link
            href="/join"
            className="rounded-lg border-2 border-neutral-400 bg-white px-8 py-6 text-center font-medium text-neutral-800 shadow-sm hover:border-neutral-500 hover:bg-neutral-50 transition-colors"
          >
            Join room
          </Link>
        </div>
      </main>
    </div>
  );
}
