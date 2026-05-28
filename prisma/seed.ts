import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.lobbyReply.deleteMany();
  await prisma.lobbyMessage.deleteMany();
  await prisma.roomServiceOrderItem.deleteMany();
  await prisma.roomServiceOrder.deleteMany();
  await prisma.journeyEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.hotel.deleteMany();

  await prisma.hotel.create({
    data: {
      name: "Maison Solenne",
      tagline: "An intimate seaside retreat where every hour feels golden.",
      city: "Saint-Tropez",
      country: "France",
      description:
        "A boutique five-star sanctuary blending Mediterranean light, hand-finished interiors, and an attentive concierge tradition."
    }
  });

  const types = await Promise.all([
    prisma.roomType.create({
      data: {
        slug: "ocean-view-suite",
        name: "Ocean View Suite",
        shortPitch: "Sunrise over the Mediterranean from a private terrace.",
        description:
          "A bright corner suite with floor-to-ceiling glass, a deep soaking tub facing the sea, and a private terrace with daybed.",
        mood: "Serene · Coastal · Cinematic",
        amenities: JSON.stringify([
          "Private sea-facing terrace",
          "King bed with linen drape",
          "Marble soaking tub",
          "Espresso & tea bar",
          "Smart climate & lighting",
          "Plush robes & slippers"
        ]),
        capacity: 2,
        bedConfig: "1 King",
        sizeSqft: 620,
        view: "Mediterranean Sea",
        nightlyRate: 78000,
        heroColor: "from-sky-500/30 via-teal-500/20 to-amber-300/20",
        imageEmoji: "🌊"
      }
    }),
    prisma.roomType.create({
      data: {
        slug: "garden-king-room",
        name: "Garden King Room",
        shortPitch: "A hushed garden retreat scented with jasmine and citrus.",
        description:
          "A ground-floor sanctuary opening onto the citrus garden, with a king bed dressed in Egyptian cotton and a rainfall shower.",
        mood: "Quiet · Botanical · Restorative",
        amenities: JSON.stringify([
          "Private garden patio",
          "King bed, Egyptian cotton",
          "Rainfall shower",
          "Aromatherapy minibar",
          "Bluetooth audio"
        ]),
        capacity: 2,
        bedConfig: "1 King",
        sizeSqft: 480,
        view: "Citrus Garden",
        nightlyRate: 52000,
        heroColor: "from-emerald-500/30 via-lime-400/20 to-amber-200/20",
        imageEmoji: "🌿"
      }
    }),
    prisma.roomType.create({
      data: {
        slug: "executive-business-suite",
        name: "Executive Business Suite",
        shortPitch: "A composed workspace and lounge with skyline windows.",
        description:
          "Two-room suite with a private study, ergonomic workstation, lounge seating, and curated turndown service for late nights.",
        mood: "Composed · Modern · Productive",
        amenities: JSON.stringify([
          "Private study with desk",
          "King bed in primary room",
          "High-speed wired internet",
          "Espresso bar & breakfast tray",
          "Late checkout privilege"
        ]),
        capacity: 2,
        bedConfig: "1 King + Study",
        sizeSqft: 720,
        view: "City skyline",
        nightlyRate: 64000,
        heroColor: "from-indigo-500/30 via-slate-500/20 to-amber-200/20",
        imageEmoji: "🌆"
      }
    }),
    prisma.roomType.create({
      data: {
        slug: "family-villa",
        name: "Family Villa",
        shortPitch: "A two-bedroom villa with a private plunge pool.",
        description:
          "A standalone villa with two bedrooms, a sun-drenched living room, full dining table, and a heated plunge pool in a walled garden.",
        mood: "Playful · Spacious · Private",
        amenities: JSON.stringify([
          "Private plunge pool",
          "Two bedrooms · sleeps 5",
          "Living & dining room",
          "Kids' welcome amenities",
          "Outdoor lounge"
        ]),
        capacity: 5,
        bedConfig: "1 King + 1 Queen + Daybed",
        sizeSqft: 1240,
        view: "Walled garden & pool",
        nightlyRate: 124000,
        heroColor: "from-rose-400/30 via-amber-300/20 to-emerald-300/20",
        imageEmoji: "🏝️"
      }
    })
  ]);

  const rooms: { number: string; floor: number; roomTypeSlug: string }[] = [
    { number: "501", floor: 5, roomTypeSlug: "ocean-view-suite" },
    { number: "502", floor: 5, roomTypeSlug: "ocean-view-suite" },
    { number: "503", floor: 5, roomTypeSlug: "ocean-view-suite" },
    { number: "204", floor: 2, roomTypeSlug: "garden-king-room" },
    { number: "205", floor: 2, roomTypeSlug: "garden-king-room" },
    { number: "206", floor: 2, roomTypeSlug: "garden-king-room" },
    { number: "207", floor: 2, roomTypeSlug: "garden-king-room" },
    { number: "401", floor: 4, roomTypeSlug: "executive-business-suite" },
    { number: "402", floor: 4, roomTypeSlug: "executive-business-suite" },
    { number: "403", floor: 4, roomTypeSlug: "executive-business-suite" },
    { number: "V1", floor: 1, roomTypeSlug: "family-villa" },
    { number: "V2", floor: 1, roomTypeSlug: "family-villa" }
  ];

  for (const r of rooms) {
    const type = types.find((t) => t.slug === r.roomTypeSlug)!;
    await prisma.room.create({
      data: { number: r.number, floor: r.floor, roomTypeId: type.id }
    });
  }

  const menu: Array<{
    slug: string;
    name: string;
    description: string;
    category: string;
    priceCents: number;
    emoji: string;
  }> = [
    {
      slug: "breakfast-tray",
      name: "Maison Breakfast Tray",
      description:
        "Warm pastries, fresh fruit, soft scrambled eggs, and your choice of juice.",
      category: "BREAKFAST",
      priceCents: 3800,
      emoji: "🥐"
    },
    {
      slug: "espresso",
      name: "Single-origin Espresso",
      description: "Pulled from our house roast, served with a dark chocolate square.",
      category: "DRINK",
      priceCents: 700,
      emoji: "☕"
    },
    {
      slug: "tropical-juice",
      name: "Tropical Cold-Pressed Juice",
      description: "Pineapple, mango, passion fruit, and a hint of lime.",
      category: "DRINK",
      priceCents: 1200,
      emoji: "🍹"
    },
    {
      slug: "dinner-plate",
      name: "Chef's Dinner Plate",
      description: "Pan-seared sea bream, saffron risotto, and seasonal vegetables.",
      category: "DINNER",
      priceCents: 5600,
      emoji: "🍽️"
    },
    {
      slug: "wine-pairing",
      name: "Provence Rosé · 187ml",
      description: "A crisp, refreshing pour from a nearby estate.",
      category: "DRINK",
      priceCents: 2200,
      emoji: "🍷"
    },
    {
      slug: "garden-mocktail",
      name: "Garden Mocktail",
      description: "Cucumber, elderflower, and citrus over crushed ice.",
      category: "DRINK",
      priceCents: 1400,
      emoji: "🥂"
    },
    {
      slug: "extra-towels",
      name: "Extra Plush Towels",
      description: "A fresh set of large bath towels delivered to your room.",
      category: "HOUSEKEEPING",
      priceCents: 0,
      emoji: "🛁"
    },
    {
      slug: "housekeeping",
      name: "Housekeeping Refresh",
      description: "A discreet tidy-up of your room at your preferred time.",
      category: "HOUSEKEEPING",
      priceCents: 0,
      emoji: "🧺"
    },
    {
      slug: "airport-shuttle",
      name: "Airport Shuttle Request",
      description: "A private car to or from the airport at your selected time.",
      category: "CONCIERGE",
      priceCents: 8500,
      emoji: "🚘"
    },
    {
      slug: "spa-appointment",
      name: "Spa Appointment Request",
      description: "A 60-minute signature treatment in our seaside spa.",
      category: "SPA",
      priceCents: 14500,
      emoji: "💆"
    }
  ];

  for (const m of menu) {
    await prisma.menuItem.create({ data: m });
  }

  console.log("Seed complete:", {
    roomTypes: types.length,
    rooms: rooms.length,
    menuItems: menu.length
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
