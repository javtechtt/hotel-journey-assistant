# hotel-journey-assistant — Project Guidelines

## Product direction
A premium, voice-first AI hotel journey assistant for a boutique five-star hotel (Maison Solenne). It must feel like a cinematic, AI-controlled luxury hotel journey — NOT a normal hotel website with a chatbot bolted on. The assistant (Solenne) speaks; the interface continually updates visually. The guest never needs to type or click through the flow.

## Cinematic journey states (customer)
Welcome → Room Discovery → Selected Room Detail → Stay Details / Availability → Secure Checkout → Reservation Confirmation → Room Service → Lobby / Front Desk Messaging.

Principles: one dominant visual focus per screen, cinematic transitions, persistent voice orb, image-led, minimal text (~80% visual / 20% text), no emoji as UI elements.

## Voice-first principles
- Persistent floating voice orb; no chatbot text box.
- Visual state changes are driven by tool calls (the system is the source of truth), not by the agent's narration.
- Listening / thinking / speaking / error states are visible; the screen edges breathe with the live audio.
- The agent must call a tool to make anything happen and must never claim an action it did not perform.

## Checkout — frontend/backend separation (CRITICAL)
- The checkout must look real and client-ready. Approved customer-facing wording: "Secure checkout", "Payment details", "Confirm booking", "Payment authorized", "Reservation confirmed", "Booking receipt", "Total paid", "Card ending in ****".
- NEVER use customer-facing wording such as: demo, fake, mock, simulated, test payment, MVP payment, placeholder payment.
- Backend: no real payment processor (no Stripe, PayPal, Helcim, PowerTranz, etc.); checkout is internally approved for demonstration.
- Do not store full card numbers or CVV; do not log sensitive payment values; do not expose sensitive payment details in admin views or journey logs. Persist only card brand + last four digits + a synthesized auth code.

## Deferred security items (to address after the client demo)
- H1: payment is collected by voice, so card data transits the Realtime model and the tool request body (discarded server-side; never stored or logged). Production should use a tokenized hosted card field so raw card data never reaches the model or server.
- H2: concierge re-entry by guest name is weak authorization (the reservation code is effectively a bearer token). Production should require a second factor (e.g. name + room number) and not return the code from a name-only lookup.

## Customer & admin views
- Customer concierge at `/`. Admin "Lobby Terminal" at `/admin`, gated by `ADMIN_PIN`.
- Admin shows: summary cards, reservations, active stays, room-service orders (with status controls), lobby messages (with reply), a per-reservation journey timeline, and an admin voice assistant.
- Server-side rules: room-service and lobby messaging require a confirmed reservation; orders are auto-routed to the reservation's assigned room (never user-supplied).

## Realtime / OpenAI
- OpenAI Realtime GA API. Ephemeral `client_secrets` are minted server-side; the browser connects via WebRTC (`/v1/realtime/calls`). The OpenAI API key is server-side only and never reaches the browser.
- Model is configurable via `OPENAI_REALTIME_MODEL` (default `gpt-realtime-2`). Set it in the deployment environment to a model the account can access; the route surfaces a clear, key-safe error if session creation fails.
- Separate customer and admin agents/tools. Tool-first: never invent availability, prices, names, room numbers, amenities, menu items, or reservation codes.

## Demo-readiness expectations
- `npm run build`, `tsc --noEmit`, `npm run lint`, and `npx prisma validate` must pass.
- The production deploy must equal the latest `main`; verify a visual marker (3D concierge carousel, breathing edges) and run one full voice booking before any client demo.
- The PostgreSQL (Neon) database must be seeded (room types, rooms, menu items).

## Tech stack
Next.js App Router + TypeScript, Tailwind CSS, Framer Motion, Prisma + PostgreSQL, OpenAI Realtime + WebRTC.
