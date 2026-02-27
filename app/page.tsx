"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

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
      ((data as RoomSession).role === "host" ||
        (data as RoomSession).role === "player") &&
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

const gradientBg =
  "radial-gradient(ellipse at center, #0045f6 0%, #0038d4 35%, #002a9e 70%, #001a62 100%)";

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
          router.replace(
            `/room/${room.code}?hostId=${encodeURIComponent(session.id)}`
          );
          return;
        }
        if (session.role === "player" && Array.isArray(room.players)) {
          const inRoom = room.players.some(
            (p: { id: string }) => p.id === session.id
          );
          if (inRoom) {
            router.replace(
              `/room/${room.code}?playerId=${encodeURIComponent(session.id)}`
            );
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
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: gradientBg }}
      >
        <motion.p
          className="text-white/90 text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          Loading…
        </motion.p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative px-4"
      style={{ background: gradientBg }}
    >
        <motion.h1
          className="text-5xl sm:text-6xl md:text-7xl text-white drop-shadow-lg text-center absolute left-1/2 -translate-x-1/2 w-full max-w-sm"
          style={{
            fontFamily: "var(--font-pacifico), cursive",
            bottom: "calc(50% + 140px)",
          }}
        initial={{ opacity: 0, y: -32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        Housie
      </motion.h1>

      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur-sm shadow-2xl p-8 flex flex-col gap-4"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.5,
          delay: 0.2,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <Link href="/create" className="block">
          <motion.span
            className="btn-primary cursor-pointer select-none"
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
          >
            Create room
          </motion.span>
        </Link>
        <Link href="/join" className="block">
          <motion.span
            className="btn-secondary cursor-pointer select-none"
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
          >
            Join room
          </motion.span>
        </Link>
      </motion.div>
    </div>
  );
}
