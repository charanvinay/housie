import { NextResponse } from "next/server";
import { createRoom } from "@/lib/rooms";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ticketPrice = Number(body.ticketPrice);
    const hostTicketCount = Number(body.hostTicketCount);
    if (!Number.isFinite(ticketPrice) || ticketPrice < 1) {
      return NextResponse.json(
        { error: "Invalid ticket price (min 1)" },
        { status: 400 }
      );
    }
    const { room, hostId } = createRoom(
      ticketPrice,
      Number.isFinite(hostTicketCount) ? hostTicketCount : 0
    );
    return NextResponse.json({
      roomCode: room.code,
      hostId,
      ticketPrice: room.ticketPrice,
      link: `${request.headers.get("origin") || ""}/join?code=${room.code}`,
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
