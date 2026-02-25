import { NextResponse } from "next/server";
import { claimMultiple, getRoom, totalTickets, totalAmount } from "@/lib/rooms";

type Params = { params: Promise<{ code: string }> };

const VALID_TYPES = ["jaldiFive", "firstLine", "middleLine", "lastLine", "housie"] as const;

export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  try {
    const body = await request.json();
    const playerId = body?.playerId;
    const playerName = body?.playerName;
    const ticketIndex = typeof body?.ticketIndex === "number" ? body.ticketIndex : parseInt(body?.ticketIndex, 10);
    const claimTypes = Array.isArray(body?.claimTypes) ? body.claimTypes : [];
    const jaldiFiveNumbers = Array.isArray(body?.jaldiFiveNumbers) ? body.jaldiFiveNumbers.map(Number).filter((n: number) => !Number.isNaN(n) && n >= 1 && n <= 90) : undefined;

    if (!playerId || typeof playerId !== "string") {
      return NextResponse.json({ error: "playerId required" }, { status: 400 });
    }
    if (Number.isNaN(ticketIndex) || ticketIndex < 0) {
      return NextResponse.json({ error: "Valid ticketIndex required" }, { status: 400 });
    }
    const types = claimTypes.filter((t: string) => VALID_TYPES.includes(t as typeof VALID_TYPES[number]));
    if (types.length === 0) {
      return NextResponse.json({ error: "At least one claim type required" }, { status: 400 });
    }
    if (types.includes("jaldiFive") && (!jaldiFiveNumbers || jaldiFiveNumbers.length !== 5)) {
      return NextResponse.json({ error: "jaldiFiveNumbers (5 numbers) required when claiming Jaldi Five" }, { status: 400 });
    }

    const result = claimMultiple(
      code,
      playerId,
      typeof playerName === "string" ? playerName : "Player",
      ticketIndex,
      types as ("jaldiFive" | "firstLine" | "middleLine" | "lastLine" | "housie")[],
      types.includes("jaldiFive") ? jaldiFiveNumbers : undefined
    );
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const room = getRoom(code)!;
    return NextResponse.json({
      ok: true,
      room: { ...room, totalTickets: totalTickets(room), totalAmount: totalAmount(room) },
    });
  } catch {
    return NextResponse.json({ error: "Failed to claim" }, { status: 500 });
  }
}
