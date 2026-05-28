import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reply_to_guest } from "@/lib/tool-handlers";
import { isAdminAuthorized } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const messages = await prisma.lobbyMessage.findMany({
    include: { replies: true, reservation: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      room_number: m.roomNumber,
      guest_name: m.reservation.guestName,
      body: m.body,
      status: m.status,
      created_at: m.createdAt.toISOString(),
      replies: m.replies.map((r) => ({
        body: r.body,
        from_staff: r.fromStaff,
        at: r.createdAt.toISOString()
      }))
    }))
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.message_id || !body.body) {
    return NextResponse.json({ error: "message_id and body required" }, { status: 400 });
  }
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Admin PIN required" }, { status: 401 });
  }
  const result = await reply_to_guest({ message_id: body.message_id, body: body.body });
  return NextResponse.json(result);
}
