export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export function formatDateLong(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / ms));
}

export function parseDateInput(input: string | undefined | null): Date | null {
  if (!input) return null;
  const d = new Date(input);
  if (!Number.isNaN(d.getTime())) return d;
  return null;
}

export function generateCode(prefix = "MS"): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${s}`;
}
