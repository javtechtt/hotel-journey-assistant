import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthorized } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Admin PIN required" }, { status: 401 });
  }

  const [
    totalReservations,
    activeStays,
    pendingOrders,
    openMessages,
    reservationsToday,
    reservations,
    orders,
    messages,
    events
  ] = await Promise.all([
    prisma.reservation.count(),
    prisma.reservation.count({ where: { status: "CONFIRMED" } }),
    prisma.roomServiceOrder.count({
      where: { status: { notIn: ["DELIVERED", "CANCELLED"] } }
    }),
    prisma.lobbyMessage.count({ where: { status: "OPEN" } }),
    prisma.reservation.count({
      where: { createdAt: { gte: new Date(new Date().toISOString().slice(0, 10)) } }
    }),
    prisma.reservation.findMany({
      include: { room: true, roomType: true, payment: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.roomServiceOrder.findMany({
      include: { items: true, reservation: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.lobbyMessage.findMany({
      include: { replies: true, reservation: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.journeyEvent.findMany({
      include: { reservation: { include: { room: true } } },
      orderBy: { createdAt: "desc" },
      take: 80
    })
  ]);

  return NextResponse.json({
    totals: {
      reservations: totalReservations,
      active_stays: activeStays,
      pending_orders: pendingOrders,
      open_messages: openMessages,
      reservations_today: reservationsToday
    },
    reservations: reservations.map((r) => ({
      code: r.code,
      guest_name: r.guestName,
      party_size: r.partySize,
      status: r.status,
      check_in_date: r.checkInDate.toISOString(),
      check_out_date: r.checkOutDate.toISOString(),
      nights: r.nights,
      room_type: r.roomType.name,
      room_number: r.room?.number ?? null,
      total_cents: r.totalCents,
      card_brand: r.cardBrand,
      card_last4: r.cardLast4,
      confirmed_at: r.confirmedAt?.toISOString() ?? null,
      created_at: r.createdAt.toISOString()
    })),
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
    })),
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
    })),
    events: events.map((e) => ({
      id: e.id,
      kind: e.kind,
      label: e.label,
      at: e.createdAt.toISOString(),
      reservation_code: e.reservation?.code ?? null,
      room_number: e.reservation?.room?.number ?? null
    }))
  });
}
