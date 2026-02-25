import { NextResponse } from "next/server";
import { endRoom } from "@/lib/rooms";

type Params = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  try {
    const body = await request.json();
    const hostId = body?.hostId;
    if (!hostId || typeof hostId !== "string") {
      return NextResponse.json({ error: "hostId required" }, { status: 400 });
    }
    const result = endRoom(code, hostId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to end room" }, { status: 500 });
  }
}
