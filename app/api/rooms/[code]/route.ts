import { NextResponse } from "next/server";
import { getRoom, joinRoom, totalTickets, totalAmount } from "@/lib/rooms";

type Params = { params: Promise<{ code: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { code } = await params;
  const room = getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  return NextResponse.json({
    ...room,
    totalTickets: totalTickets(room),
    totalAmount: totalAmount(room),
  });
}

export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  try {
    const body = await request.json();
    const result = joinRoom(code, {
      playerName: body.playerName,
      ticketCount: body.ticketCount ?? 1,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const room = result.room;
    return NextResponse.json({
      roomCode: room.code,
      playerId: result.playerId,
      room: {
        ...room,
        totalTickets: totalTickets(room),
        totalAmount: totalAmount(room),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
  }
}
