import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const types = await prisma.roomType.findMany({ orderBy: { nightlyRate: "asc" } });
  return NextResponse.json({
    room_types: types.map((t) => ({
      slug: t.slug,
      name: t.name,
      short_pitch: t.shortPitch,
      description: t.description,
      mood: t.mood,
      amenities: JSON.parse(t.amenities),
      capacity: t.capacity,
      bed_config: t.bedConfig,
      size_sqft: t.sizeSqft,
      view: t.view,
      nightly_rate_cents: t.nightlyRate,
      hero_color: t.heroColor,
      emoji: t.imageEmoji
    }))
  });
}
