import { NextResponse } from "next/server";
import { leaveRoom } from "@/lib/rooms";

type Params = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  try {
    const body = await request.json();
    const playerId = body?.playerId;
    if (!playerId || typeof playerId !== "string") {
      return NextResponse.json({ error: "playerId required" }, { status: 400 });
    }
    const result = leaveRoom(code, playerId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to leave room" }, { status: 500 });
  }
}
