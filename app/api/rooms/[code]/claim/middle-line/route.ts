import { NextResponse } from "next/server";
import { claimMiddleLine, getRoom, totalTickets, totalAmount } from "@/lib/rooms";

type Params = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  try {
    const body = await request.json();
    const playerId = body?.playerId;
    const playerName = body?.playerName;
    const ticketIndex = typeof body?.ticketIndex === "number" ? body.ticketIndex : parseInt(body?.ticketIndex, 10);
    if (!playerId || typeof playerId !== "string") {
      return NextResponse.json({ error: "playerId required" }, { status: 400 });
    }
    if (Number.isNaN(ticketIndex) || ticketIndex < 0) {
      return NextResponse.json({ error: "Valid ticketIndex required" }, { status: 400 });
    }
    const result = claimMiddleLine(
      code,
      playerId,
      typeof playerName === "string" ? playerName : "Player",
      ticketIndex
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
