// Admin PIN gate. Normalizes both the configured value and the provided header
// (trims whitespace and strips accidental surrounding quotes) so a value pasted
// into a dashboard as "1234" still matches a typed 1234.
function normalize(v: string | null | undefined): string {
  return (v ?? "").trim().replace(/^["']|["']$/g, "").trim();
}

export function configuredAdminPin(): string {
  return normalize(process.env.ADMIN_PIN);
}

/** True if the request is authorized. If no PIN is configured, access is open. */
export function isAdminAuthorized(req: Request): boolean {
  const pin = configuredAdminPin();
  if (!pin) return true;
  return normalize(req.headers.get("x-admin-pin")) === pin;
}
