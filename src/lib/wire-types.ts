// Canonical client-side shapes + normalizers. The REST API and the Realtime
// tool handlers return slightly different field names (cents vs usd); these
// helpers normalize both into one shape so components stay simple.

export type RoomTypeWire = {
  slug: string;
  name: string;
  shortPitch: string;
  description: string;
  mood: string;
  amenities: string[];
  capacity: number;
  bedConfig: string;
  sizeSqft: number;
  view: string;
  nightlyRateCents: number;
};

export function normalizeRoom(raw: any): RoomTypeWire {
  const rateCents =
    raw.nightly_rate_cents ??
    (raw.nightly_rate_usd != null ? Math.round(raw.nightly_rate_usd * 100) : 0);
  return {
    slug: raw.slug,
    name: raw.name,
    shortPitch: raw.short_pitch ?? raw.shortPitch ?? "",
    description: raw.description ?? "",
    mood: raw.mood ?? "",
    amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
    capacity: raw.capacity ?? 2,
    bedConfig: raw.bed_config ?? raw.bedConfig ?? "",
    sizeSqft: raw.size_sqft ?? raw.sizeSqft ?? 0,
    view: raw.view ?? "",
    nightlyRateCents: rateCents
  };
}

export type AvailabilityWire = {
  check_in_date: string;
  check_out_date: string;
  party_size: number;
  nights: number;
  availability: Array<{
    slug: string;
    name: string;
    mood: string;
    capacity: number;
    rooms_available: number;
    total_rooms: number;
    nightly_rate_usd: number;
    estimated_total_usd: number;
  }>;
};

export type ReservationWire = {
  reservation_code: string;
  guest_name: string;
  room_type: string;
  room_type_slug?: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  party_size: number;
  nightly_rate_usd: number;
  subtotal_usd: number;
  taxes_usd: number;
  total_usd: number;
  status: "HOLD" | "CONFIRMED";
  room_number?: string | null;
  card_brand?: string | null;
  card_last4?: string | null;
};

export type OrderWire = {
  order_id: string;
  room_number: string;
  status: "RECEIVED" | "PREPARING" | "EN_ROUTE" | "DELIVERED" | "CANCELLED";
  total_usd: number;
  items: Array<{ name: string; quantity: number; price_usd: number }>;
};

export type LobbyMessageWire = {
  message_id: string;
  room_number: string;
  body: string;
  status: "OPEN" | "RESOLVED";
  replies?: Array<{ body: string; from_staff: boolean; at: string }>;
};

export type MenuItemWire = {
  slug: string;
  name: string;
  description: string;
  category: string;
  price_usd: number;
};

export type JourneyEventWire = {
  id?: string;
  kind: string;
  label: string;
  at: string;
};
