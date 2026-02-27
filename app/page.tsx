"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/PageWrapper";
import { Button } from "@/components/Button";

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

  return (
    <PageWrapper>
      {checking ? (
        <motion.p
          className="text-neutral-600 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          Loading…
        </motion.p>
      ) : (
        <div className="flex flex-col gap-4">
          <Button href="/create" variant="primary">
            Create room
          </Button>
          <Button href="/join" variant="secondary">
            Join room
          </Button>
        </div>
      )}
    </PageWrapper>
  );
}
