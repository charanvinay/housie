import { NextResponse } from "next/server";
import { claimJaldiFive, getRoom, totalTickets, totalAmount } from "@/lib/rooms";

type Params = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  try {
    const body = await request.json();
    const playerId = body?.playerId;
    const playerName = body?.playerName;
    const numbers = body?.numbers;
    if (!playerId || typeof playerId !== "string") {
      return NextResponse.json({ error: "playerId required" }, { status: 400 });
    }
    if (!Array.isArray(numbers) || numbers.length !== 5) {
      return NextResponse.json({ error: "Exactly 5 numbers required" }, { status: 400 });
    }
    const numList = numbers.map(Number).filter((n: number) => !Number.isNaN(n) && n >= 1 && n <= 90);
    if (numList.length !== 5) {
      return NextResponse.json({ error: "Exactly 5 valid numbers (1–90) required" }, { status: 400 });
    }
    const result = claimJaldiFive(
      code,
      playerId,
      typeof playerName === "string" ? playerName : "Player",
      numList
    );
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
    return NextResponse.json({ error: "Failed to claim" }, { status: 500 });
  }
}
