import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthorized } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hard-delete a reservation and everything that hangs off it. The schema has no
// DB-level cascade from these children to Reservation, so remove them in a
// single transaction first. (Order items and lobby replies do cascade from
// their own parents.)
export async function DELETE(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Admin PIN required" }, { status: 401 });
  }
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const reservation = await prisma.reservation.findUnique({ where: { code } });
  if (!reservation) return NextResponse.json({ error: "not found" }, { status: 404 });
  const reservationId = reservation.id;

  await prisma.$transaction([
    prisma.roomServiceOrder.deleteMany({ where: { reservationId } }),
    prisma.lobbyMessage.deleteMany({ where: { reservationId } }),
    prisma.journeyEvent.deleteMany({ where: { reservationId } }),
    prisma.payment.deleteMany({ where: { reservationId } }),
    prisma.reservation.delete({ where: { id: reservationId } })
  ]);

  return NextResponse.json({ ok: true, code });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const r = await prisma.reservation.findUnique({
      where: { code },
      include: { room: true, roomType: true, payment: true }
    });
    if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ reservation: serialize(r) });
  }
  const list = await prisma.reservation.findMany({
    include: { room: true, roomType: true, payment: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ reservations: list.map(serialize) });
}

function serialize(r: any) {
  return {
    code: r.code,
    guest_name: r.guestName,
    party_size: r.partySize,
    check_in_date: r.checkInDate.toISOString(),
    check_out_date: r.checkOutDate.toISOString(),
    nights: r.nights,
    status: r.status,
    subtotal_cents: r.subtotalCents,
    taxes_cents: r.taxesCents,
    total_cents: r.totalCents,
    room_type: r.roomType?.name,
    room_number: r.room?.number ?? null,
    card_brand: r.cardBrand,
    card_last4: r.cardLast4,
    confirmed_at: r.confirmedAt?.toISOString() ?? null,
    created_at: r.createdAt.toISOString()
  };
}
