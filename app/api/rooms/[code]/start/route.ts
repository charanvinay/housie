import { NextResponse } from "next/server";
import { startGame, getRoom, totalTickets, totalAmount } from "@/lib/rooms";

type Params = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  try {
    const body = await request.json();
    const hostId = body?.hostId;
    if (!hostId || typeof hostId !== "string") {
      return NextResponse.json({ error: "hostId required" }, { status: 400 });
    }
    const result = startGame(code, hostId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const room = getRoom(code)!;
    return NextResponse.json({
      ok: true,
      room: {
        ...room,
        totalTickets: totalTickets(room),
        totalAmount: totalAmount(room),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 });
  }
}
