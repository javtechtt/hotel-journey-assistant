import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { update_order_status } from "@/lib/tool-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orders = await prisma.roomServiceOrder.findMany({
    include: { items: true, reservation: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      room_number: o.roomNumber,
      guest_name: o.reservation.guestName,
      status: o.status,
      total_cents: o.totalCents,
      notes: o.notes,
      created_at: o.createdAt.toISOString(),
      items: o.items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        price_cents: it.priceCents
      }))
    }))
  });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  if (!body.order_id || !body.status) {
    return NextResponse.json({ error: "order_id and status required" }, { status: 400 });
  }
  const adminPin = process.env.ADMIN_PIN;
  if (adminPin && req.headers.get("x-admin-pin") !== adminPin) {
    return NextResponse.json({ error: "Admin PIN required" }, { status: 401 });
  }
  const result = await update_order_status({ order_id: body.order_id, status: body.status });
  return NextResponse.json(result);
}
