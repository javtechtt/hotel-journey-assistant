import { prisma } from "@/lib/db";
import { generateCode, nightsBetween } from "@/lib/format";

type Json = Record<string, unknown>;

function ok<T extends Json | unknown[]>(data: T) {
  return { ok: true as const, data };
}
function fail(message: string, extra?: Json) {
  return { ok: false as const, error: message, ...extra };
}

async function logEvent(opts: {
  reservationId?: string | null;
  sessionId?: string | null;
  kind: string;
  label: string;
  metadata?: Json;
}) {
  await prisma.journeyEvent.create({
    data: {
      reservationId: opts.reservationId ?? null,
      sessionId: opts.sessionId ?? null,
      kind: opts.kind,
      label: opts.label,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : null
    }
  });
}

function parseAmenities(json: string): string[] {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

function roomTypeToWire(rt: {
  id: string;
  slug: string;
  name: string;
  shortPitch: string;
  description: string;
  mood: string;
  amenities: string;
  capacity: number;
  bedConfig: string;
  sizeSqft: number;
  view: string;
  nightlyRate: number;
  heroColor: string;
  imageEmoji: string;
}) {
  return {
    slug: rt.slug,
    name: rt.name,
    short_pitch: rt.shortPitch,
    description: rt.description,
    mood: rt.mood,
    amenities: parseAmenities(rt.amenities),
    capacity: rt.capacity,
    bed_config: rt.bedConfig,
    size_sqft: rt.sizeSqft,
    view: rt.view,
    nightly_rate_usd: rt.nightlyRate / 100,
    hero_color: rt.heroColor,
    emoji: rt.imageEmoji
  };
}

// -------- Customer tools --------

export async function get_room_options(_: Json, ctx: { sessionId?: string }) {
  const types = await prisma.roomType.findMany({ orderBy: { nightlyRate: "asc" } });
  await logEvent({
    sessionId: ctx.sessionId,
    kind: "VIEWED_ROOMS",
    label: "Viewed room catalog"
  });
  return ok({ room_types: types.map(roomTypeToWire) });
}

export async function get_room_details(args: { room_type_slug: string }, ctx: { sessionId?: string }) {
  const rt = await prisma.roomType.findUnique({ where: { slug: args.room_type_slug } });
  if (!rt) return fail("Room type not found.");
  await logEvent({
    sessionId: ctx.sessionId,
    kind: "ROOM_VIEWED",
    label: `Looked at ${rt.name}`,
    metadata: { slug: rt.slug }
  });
  return ok({ room_type: roomTypeToWire(rt) });
}

export async function check_availability(
  args: { check_in_date: string; check_out_date: string; party_size: number },
  ctx: { sessionId?: string }
) {
  const checkIn = new Date(args.check_in_date);
  const checkOut = new Date(args.check_out_date);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    return fail("Invalid dates. Please provide ISO YYYY-MM-DD dates.");
  }
  if (checkOut <= checkIn) return fail("Check-out must be after check-in.");
  const nights = nightsBetween(checkIn, checkOut);
  const types = await prisma.roomType.findMany({
    include: { rooms: { include: { reservations: true } } }
  });

  const availability = types
    .filter((t) => t.capacity >= args.party_size)
    .map((t) => {
      const free = t.rooms.filter((room) => {
        const overlapping = room.reservations.filter(
          (r) =>
            r.status !== "CANCELLED" &&
            r.checkInDate < checkOut &&
            r.checkOutDate > checkIn
        );
        return overlapping.length === 0;
      });
      return {
        slug: t.slug,
        name: t.name,
        mood: t.mood,
        capacity: t.capacity,
        rooms_available: free.length,
        total_rooms: t.rooms.length,
        nightly_rate_usd: t.nightlyRate / 100,
        estimated_total_usd: (t.nightlyRate * nights) / 100,
        emoji: t.imageEmoji
      };
    });

  await logEvent({
    sessionId: ctx.sessionId,
    kind: "CHECKED_AVAILABILITY",
    label: `Checked availability ${args.check_in_date} → ${args.check_out_date}`,
    metadata: { ...args, nights }
  });

  return ok({
    check_in_date: args.check_in_date,
    check_out_date: args.check_out_date,
    nights,
    party_size: args.party_size,
    availability
  });
}

export async function create_reservation_hold(
  args: {
    guest_name: string;
    room_type_slug: string;
    check_in_date: string;
    check_out_date: string;
    party_size: number;
  },
  ctx: { sessionId?: string }
) {
  const rt = await prisma.roomType.findUnique({
    where: { slug: args.room_type_slug },
    include: { rooms: { include: { reservations: true } } }
  });
  if (!rt) return fail("Room type not found.");
  const checkIn = new Date(args.check_in_date);
  const checkOut = new Date(args.check_out_date);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()))
    return fail("Invalid dates.");
  if (checkOut <= checkIn) return fail("Check-out must be after check-in.");
  if (rt.capacity < args.party_size)
    return fail(`The ${rt.name} fits up to ${rt.capacity} guests.`);

  const free = rt.rooms.filter((room) => {
    const overlapping = room.reservations.filter(
      (r) =>
        r.status !== "CANCELLED" &&
        r.checkInDate < checkOut &&
        r.checkOutDate > checkIn
    );
    return overlapping.length === 0;
  });
  if (free.length === 0) return fail("No rooms of that type are available on those dates.");

  const nights = nightsBetween(checkIn, checkOut);
  const subtotal = rt.nightlyRate * nights;
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal + taxes;
  const code = generateCode();

  const reservation = await prisma.reservation.create({
    data: {
      code,
      guestName: args.guest_name,
      partySize: args.party_size,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights,
      roomTypeId: rt.id,
      roomId: null,
      status: "HOLD",
      subtotalCents: subtotal,
      taxesCents: taxes,
      totalCents: total
    }
  });

  await logEvent({
    reservationId: reservation.id,
    sessionId: ctx.sessionId,
    kind: "RESERVATION_HOLD",
    label: `Hold placed for ${rt.name} (${nights} nights)`,
    metadata: { code, guest: args.guest_name }
  });

  return ok({
    reservation_code: code,
    guest_name: reservation.guestName,
    room_type: rt.name,
    room_type_slug: rt.slug,
    check_in_date: checkIn.toISOString().slice(0, 10),
    check_out_date: checkOut.toISOString().slice(0, 10),
    nights,
    party_size: reservation.partySize,
    nightly_rate_usd: rt.nightlyRate / 100,
    subtotal_usd: subtotal / 100,
    taxes_usd: taxes / 100,
    total_usd: total / 100,
    status: "HOLD"
  });
}

export async function confirm_checkout(
  args: { reservation_code: string; card_last4?: string; card_brand?: string },
  ctx: { sessionId?: string }
) {
  const reservation = await prisma.reservation.findUnique({
    where: { code: args.reservation_code },
    include: { roomType: { include: { rooms: { include: { reservations: true } } } } }
  });
  if (!reservation) return fail("Reservation not found.");
  if (reservation.status === "CONFIRMED" && reservation.roomId) {
    const room = await prisma.room.findUnique({ where: { id: reservation.roomId } });
    return ok({
      reservation_code: reservation.code,
      room_number: room?.number ?? null,
      status: "CONFIRMED",
      already_confirmed: true
    });
  }

  const free = reservation.roomType.rooms.filter((room) => {
    const overlapping = room.reservations.filter(
      (r) =>
        r.id !== reservation.id &&
        r.status !== "CANCELLED" &&
        r.checkInDate < reservation.checkOutDate &&
        r.checkOutDate > reservation.checkInDate
    );
    return overlapping.length === 0;
  });
  if (free.length === 0)
    return fail("That room type is no longer available on those dates.");

  const assigned = free[0];
  const last4 =
    args.card_last4 && /^\d{4}$/.test(args.card_last4)
      ? args.card_last4
      : String(Math.floor(1000 + Math.random() * 9000));
  const brand = args.card_brand || "Visa";
  const authCode = `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: "CONFIRMED",
      roomId: assigned.id,
      confirmedAt: new Date(),
      cardLast4: last4,
      cardBrand: brand,
      payment: {
        create: {
          amountCents: reservation.totalCents,
          cardLast4: last4,
          cardBrand: brand,
          status: "APPROVED",
          authCode
        }
      }
    },
    include: { payment: true }
  });

  await logEvent({
    reservationId: updated.id,
    sessionId: ctx.sessionId,
    kind: "CHECKOUT_COMPLETED",
    label: `Checkout completed · ${brand} •••• ${last4}`,
    metadata: { auth_code: authCode }
  });
  await logEvent({
    reservationId: updated.id,
    sessionId: ctx.sessionId,
    kind: "RESERVATION_CONFIRMED",
    label: `Reservation confirmed · Room ${assigned.number}`,
    metadata: { room_number: assigned.number }
  });

  return ok({
    reservation_code: updated.code,
    guest_name: updated.guestName,
    room_number: assigned.number,
    status: "CONFIRMED",
    card_brand: brand,
    card_last4: last4,
    auth_code: authCode,
    total_usd: updated.totalCents / 100
  });
}

export async function get_active_reservation(args: { reservation_code: string }) {
  const r = await prisma.reservation.findUnique({
    where: { code: args.reservation_code },
    include: { room: true, roomType: true }
  });
  if (!r) return fail("Reservation not found.");
  return ok({
    reservation_code: r.code,
    status: r.status,
    guest_name: r.guestName,
    room_type: r.roomType.name,
    room_number: r.room?.number ?? null,
    check_in_date: r.checkInDate.toISOString().slice(0, 10),
    check_out_date: r.checkOutDate.toISOString().slice(0, 10),
    nights: r.nights,
    total_usd: r.totalCents / 100
  });
}

export async function get_menu_items() {
  const items = await prisma.menuItem.findMany({ orderBy: { category: "asc" } });
  return ok({
    items: items.map((m) => ({
      slug: m.slug,
      name: m.name,
      description: m.description,
      category: m.category,
      price_usd: m.priceCents / 100,
      emoji: m.emoji
    }))
  });
}

export async function place_room_service_order(
  args: {
    reservation_code: string;
    items: Array<{ menu_item_slug: string; quantity: number }>;
    notes?: string;
  },
  ctx: { sessionId?: string }
) {
  const reservation = await prisma.reservation.findUnique({
    where: { code: args.reservation_code },
    include: { room: true }
  });
  if (!reservation) return fail("Reservation not found.");
  if (reservation.status !== "CONFIRMED" || !reservation.room) {
    return fail(
      "Room-service orders are available after the reservation is confirmed. Please complete checkout first."
    );
  }
  if (!args.items?.length) return fail("Please include at least one item.");

  const slugs = args.items.map((i) => i.menu_item_slug);
  const menuItems = await prisma.menuItem.findMany({ where: { slug: { in: slugs } } });
  const bySlug = new Map(menuItems.map((m) => [m.slug, m]));
  for (const i of args.items) {
    if (!bySlug.has(i.menu_item_slug))
      return fail(`Menu item '${i.menu_item_slug}' was not found.`);
  }
  const total = args.items.reduce(
    (sum, i) => sum + (bySlug.get(i.menu_item_slug)!.priceCents || 0) * i.quantity,
    0
  );

  const order = await prisma.roomServiceOrder.create({
    data: {
      reservationId: reservation.id,
      roomNumber: reservation.room.number,
      status: "RECEIVED",
      totalCents: total,
      notes: args.notes ?? null,
      items: {
        create: args.items.map((i) => {
          const m = bySlug.get(i.menu_item_slug)!;
          return {
            menuItemId: m.id,
            name: m.name,
            quantity: i.quantity,
            priceCents: m.priceCents
          };
        })
      }
    },
    include: { items: true }
  });

  await logEvent({
    reservationId: reservation.id,
    sessionId: ctx.sessionId,
    kind: "ORDER_PLACED",
    label: `Room service · ${order.items.length} item${order.items.length === 1 ? "" : "s"}`,
    metadata: { order_id: order.id, room_number: reservation.room.number }
  });

  return ok({
    order_id: order.id,
    room_number: reservation.room.number,
    status: order.status,
    total_usd: order.totalCents / 100,
    items: order.items.map((it) => ({
      name: it.name,
      quantity: it.quantity,
      price_usd: it.priceCents / 100
    }))
  });
}

export async function send_lobby_message(
  args: { reservation_code: string; body: string },
  ctx: { sessionId?: string }
) {
  const reservation = await prisma.reservation.findUnique({
    where: { code: args.reservation_code },
    include: { room: true }
  });
  if (!reservation) return fail("Reservation not found.");
  if (reservation.status !== "CONFIRMED" || !reservation.room) {
    return fail(
      "Lobby messages are available after the reservation is confirmed. Please complete checkout first."
    );
  }
  if (!args.body?.trim()) return fail("The message can't be empty.");

  const msg = await prisma.lobbyMessage.create({
    data: {
      reservationId: reservation.id,
      roomNumber: reservation.room.number,
      fromGuest: true,
      body: args.body.trim(),
      status: "OPEN"
    }
  });

  await logEvent({
    reservationId: reservation.id,
    sessionId: ctx.sessionId,
    kind: "LOBBY_MESSAGE_SENT",
    label: `Message to lobby · "${args.body.trim().slice(0, 60)}"`,
    metadata: { message_id: msg.id, room_number: reservation.room.number }
  });

  return ok({
    message_id: msg.id,
    room_number: reservation.room.number,
    status: "OPEN",
    body: msg.body
  });
}

export async function get_reservation_journey(args: { reservation_code: string }) {
  const r = await prisma.reservation.findUnique({
    where: { code: args.reservation_code }
  });
  if (!r) return fail("Reservation not found.");
  const events = await prisma.journeyEvent.findMany({
    where: { reservationId: r.id },
    orderBy: { createdAt: "asc" }
  });
  return ok({
    reservation_code: r.code,
    events: events.map((e) => ({
      kind: e.kind,
      label: e.label,
      at: e.createdAt.toISOString()
    }))
  });
}

// -------- Admin tools --------

export async function get_admin_dashboard() {
  const [reservations, activeStays, pendingOrders, openMessages, today] = await Promise.all([
    prisma.reservation.count(),
    prisma.reservation.count({ where: { status: "CONFIRMED" } }),
    prisma.roomServiceOrder.count({
      where: { status: { notIn: ["DELIVERED", "CANCELLED"] } }
    }),
    prisma.lobbyMessage.count({ where: { status: "OPEN" } }),
    prisma.reservation.count({
      where: {
        createdAt: {
          gte: new Date(new Date().toISOString().slice(0, 10))
        }
      }
    })
  ]);
  return ok({
    totals: {
      reservations,
      active_stays: activeStays,
      pending_orders: pendingOrders,
      open_messages: openMessages,
      reservations_today: today
    }
  });
}

export async function get_all_active_stays() {
  const stays = await prisma.reservation.findMany({
    where: { status: "CONFIRMED" },
    include: { room: true, roomType: true },
    orderBy: { confirmedAt: "desc" }
  });
  return ok({
    stays: stays.map((s) => ({
      reservation_code: s.code,
      guest_name: s.guestName,
      room_number: s.room?.number ?? null,
      room_type: s.roomType.name,
      check_in_date: s.checkInDate.toISOString().slice(0, 10),
      check_out_date: s.checkOutDate.toISOString().slice(0, 10),
      total_usd: s.totalCents / 100
    }))
  });
}

export async function get_room_journey(args: {
  reservation_code?: string;
  room_number?: string;
}) {
  let reservationId: string | null = null;
  if (args.reservation_code) {
    const r = await prisma.reservation.findUnique({
      where: { code: args.reservation_code }
    });
    if (!r) return fail("Reservation code not found.");
    reservationId = r.id;
  } else if (args.room_number) {
    const room = await prisma.room.findUnique({
      where: { number: args.room_number },
      include: {
        reservations: { where: { status: "CONFIRMED" }, orderBy: { confirmedAt: "desc" } }
      }
    });
    if (!room || room.reservations.length === 0)
      return fail("No active stay for that room.");
    reservationId = room.reservations[0].id;
  } else {
    return fail("Provide reservation_code or room_number.");
  }

  const events = await prisma.journeyEvent.findMany({
    where: { reservationId },
    orderBy: { createdAt: "asc" }
  });
  const r = await prisma.reservation.findUnique({
    where: { id: reservationId! },
    include: { room: true, roomType: true }
  });

  return ok({
    reservation_code: r!.code,
    guest_name: r!.guestName,
    room_number: r!.room?.number ?? null,
    room_type: r!.roomType.name,
    events: events.map((e) => ({
      kind: e.kind,
      label: e.label,
      at: e.createdAt.toISOString()
    }))
  });
}

export async function get_pending_orders() {
  const orders = await prisma.roomServiceOrder.findMany({
    where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
    include: { items: true, reservation: true },
    orderBy: { createdAt: "asc" }
  });
  return ok({
    orders: orders.map((o) => ({
      order_id: o.id,
      room_number: o.roomNumber,
      guest_name: o.reservation.guestName,
      status: o.status,
      total_usd: o.totalCents / 100,
      items: o.items.map((i) => ({ name: i.name, quantity: i.quantity })),
      created_at: o.createdAt.toISOString()
    }))
  });
}

export async function update_order_status(args: { order_id: string; status: string }) {
  const order = await prisma.roomServiceOrder.findUnique({
    where: { id: args.order_id }
  });
  if (!order) return fail("Order not found.");
  const updated = await prisma.roomServiceOrder.update({
    where: { id: order.id },
    data: { status: args.status }
  });
  await logEvent({
    reservationId: order.reservationId,
    kind: "ORDER_STATUS_CHANGED",
    label: `Order ${order.id.slice(-6).toUpperCase()} → ${args.status}`,
    metadata: { order_id: order.id, status: args.status }
  });
  return ok({ order_id: updated.id, status: updated.status });
}

export async function get_lobby_messages() {
  const messages = await prisma.lobbyMessage.findMany({
    include: { replies: true, reservation: true },
    orderBy: { createdAt: "desc" }
  });
  return ok({
    messages: messages.map((m) => ({
      message_id: m.id,
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

export async function reply_to_guest(args: { message_id: string; body: string }) {
  const msg = await prisma.lobbyMessage.findUnique({ where: { id: args.message_id } });
  if (!msg) return fail("Message not found.");
  if (!args.body?.trim()) return fail("Reply can't be empty.");
  const reply = await prisma.lobbyReply.create({
    data: { messageId: msg.id, body: args.body.trim(), fromStaff: true }
  });
  await prisma.lobbyMessage.update({
    where: { id: msg.id },
    data: { status: "RESOLVED" }
  });
  await logEvent({
    reservationId: msg.reservationId,
    kind: "LOBBY_REPLY_SENT",
    label: `Front desk replied to room ${msg.roomNumber}`,
    metadata: { message_id: msg.id }
  });
  return ok({ reply_id: reply.id, message_id: msg.id, status: "RESOLVED" });
}

export const CUSTOMER_HANDLERS = {
  get_room_options,
  get_room_details,
  check_availability,
  create_reservation_hold,
  confirm_checkout,
  get_active_reservation,
  get_menu_items,
  place_room_service_order,
  send_lobby_message,
  get_reservation_journey
} as const;

export const ADMIN_HANDLERS = {
  get_admin_dashboard,
  get_all_active_stays,
  get_room_journey,
  get_pending_orders,
  update_order_status,
  get_lobby_messages,
  reply_to_guest
} as const;

export type CustomerToolName = keyof typeof CUSTOMER_HANDLERS;
export type AdminToolName = keyof typeof ADMIN_HANDLERS;
