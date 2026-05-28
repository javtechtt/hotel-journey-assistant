// Static visual identity per room type. Class strings are literal so Tailwind's
// JIT compiler emits them (room data comes from the DB at runtime, which the
// scanner can't see). Keyed by room-type slug.

export type RoomSceneKey = "ocean" | "garden" | "executive" | "villa";

export type RoomVisual = {
  scene: RoomSceneKey;
  /** Full-bleed background gradient (literal Tailwind classes). */
  gradient: string;
  /** Accent glow blob color. */
  glow: string;
  /** Accent text color. */
  accent: string;
  /** Aurora hues for the page atmosphere when this room is in focus. */
  aurora: [string, string];
};

const MAP: Record<string, RoomVisual> = {
  "ocean-view-suite": {
    scene: "ocean",
    gradient: "from-sky-950 via-cyan-800 to-amber-700",
    glow: "bg-cyan-400/30",
    accent: "text-cyan-200",
    aurora: ["rgba(45,178,196,0.45)", "rgba(212,167,59,0.4)"]
  },
  "garden-king-room": {
    scene: "garden",
    gradient: "from-emerald-950 via-emerald-800 to-lime-700",
    glow: "bg-emerald-400/30",
    accent: "text-emerald-200",
    aurora: ["rgba(52,160,98,0.45)", "rgba(186,212,59,0.32)"]
  },
  "executive-business-suite": {
    scene: "executive",
    gradient: "from-slate-950 via-indigo-900 to-slate-700",
    glow: "bg-indigo-400/30",
    accent: "text-indigo-200",
    aurora: ["rgba(99,102,241,0.4)", "rgba(148,163,184,0.3)"]
  },
  "family-villa": {
    scene: "villa",
    gradient: "from-rose-950 via-amber-800 to-emerald-900",
    glow: "bg-amber-400/30",
    accent: "text-amber-200",
    aurora: ["rgba(244,114,108,0.4)", "rgba(212,167,59,0.38)"]
  }
};

const FALLBACK: RoomVisual = {
  scene: "ocean",
  gradient: "from-ink-800 via-ink-700 to-ink-600",
  glow: "bg-gold-400/20",
  accent: "text-gold-200",
  aurora: ["rgba(212,167,59,0.4)", "rgba(51,178,164,0.36)"]
};

export function roomVisual(slug?: string | null): RoomVisual {
  if (!slug) return FALLBACK;
  return MAP[slug] ?? FALLBACK;
}

// Whether real room photos are layered over the procedural art.
export const ROOM_IMAGES_ENABLED = process.env.NEXT_PUBLIC_USE_ROOM_IMAGES === "1";

// How many photos exist per room type in /public/rooms. The first is
// `<slug>.webp`; the rest are `<slug>2.webp`, `<slug>3.webp`, … .
const PHOTO_COUNTS: Record<string, number> = {
  "ocean-view-suite": 1,
  "garden-king-room": 3,
  "executive-business-suite": 2,
  "family-villa": 4
};

// Ordered list of photo paths for a room's gallery. Empty when images are
// disabled, so callers fall back to the SVG scene.
export function roomPhotos(slug?: string | null): string[] {
  if (!ROOM_IMAGES_ENABLED || !slug) return [];
  const n = PHOTO_COUNTS[slug] ?? 1;
  return Array.from({ length: n }, (_, i) => `/rooms/${slug}${i === 0 ? "" : i + 1}.webp`);
}
