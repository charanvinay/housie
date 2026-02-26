import { NextResponse } from "next/server";
import { drawNumber, getRoom, totalTickets, totalAmount } from "@/lib/rooms";

type Params = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  try {
    const body = await request.json();
    const hostId = body?.hostId;
    if (!hostId || typeof hostId !== "string") {
      return NextResponse.json({ error: "hostId required" }, { status: 400 });
    }
    const result = drawNumber(code, hostId);
    const room = getRoom(code);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error, ...(room && { room: { ...room, totalTickets: totalTickets(room), totalAmount: totalAmount(room) } }) },
        { status: 400 }
      );
    }
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    return NextResponse.json({
      number: result.number,
      room: {
        ...room,
        totalTickets: totalTickets(room),
        totalAmount: totalAmount(room),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to draw number" }, { status: 500 });
  }
}
