// Shared runtime config.

// How often the customer and admin views refresh cross-screen state
// (reservation status, orders, lobby messages) from the server. This is UI
// freshness only — the voice agent gets data instantly via tool calls, and
// checkout/payment are direct tool calls, so this does not affect them.
export const POLL_INTERVAL_MS = 1500;
