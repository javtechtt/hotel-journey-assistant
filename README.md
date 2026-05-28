# Maison Solenne · Voice-First Hotel Journey Assistant

A premium, voice-first hotel concierge MVP built with Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Prisma + PostgreSQL, and the OpenAI Realtime API (`gpt-realtime-2`).

The guest never has to type or click through the booking flow — they speak with **Solenne**, the in-room AI concierge. The interface continually animates new state: room cards, availability, the reservation hold, a polished checkout, an animated reservation receipt, room-service orders, and lobby messages. Staff use a separate **Lobby Terminal** at `/admin` with its own admin voice assistant.

## Quick start

```bash
npm install
cp .env.example .env.local        # (Windows: copy .env.example .env.local)
# Edit .env.local: set OPENAI_API_KEY=sk-... and your Postgres DATABASE_URL + DIRECT_URL

npx prisma generate
npx prisma db push        # creates the tables in your Postgres database
npm run seed              # loads room types, rooms, and menu items
npm run dev
```

> **Database:** the app uses **PostgreSQL** (Neon, Vercel Postgres, or Supabase all work).
> Create a database, then put its **pooled** URL in `DATABASE_URL` and its **direct** URL in
> `DIRECT_URL`. `prisma db push` syncs the schema; `npm run seed` populates it.

Then open:

- Guest concierge: <http://localhost:3000>
- Lobby Terminal: <http://localhost:3000/admin> (PIN from `ADMIN_PIN`, default `2468`)

You will need to grant **microphone permission** in your browser the first time you tap the voice orb.

## Environment variables

| Variable              | Purpose                                                         |
| --------------------- | --------------------------------------------------------------- |
| `OPENAI_API_KEY`      | Server-side only. Used to mint ephemeral Realtime session keys. |
| `DATABASE_URL`        | Postgres **pooled** connection string (used at runtime).        |
| `DIRECT_URL`          | Postgres **direct** connection string (used by `prisma db push`).|
| `NEXT_PUBLIC_APP_URL` | Optional. Public base URL for the app.                          |
| `ADMIN_PIN`           | PIN that gates `/admin` and admin tools (default `2468`).       |
| `NEXT_PUBLIC_USE_ROOM_IMAGES` | Set to `1` to use photos in `public/rooms/` over the SVG art. |

The OpenAI API key is **never** sent to the browser. The browser receives only an ephemeral `client_secret` issued by `/api/realtime/customer` or `/api/realtime/admin`, and uses it to negotiate a WebRTC session directly with the OpenAI Realtime endpoint.

## Tech stack

- **Next.js 14** App Router + TypeScript
- **Tailwind CSS** + custom luxury theme tokens
- **Framer Motion** for cinematic transitions
- **Prisma + PostgreSQL** for the database (Neon / Vercel Postgres / Supabase)
- **OpenAI Realtime API** with model `gpt-realtime-2`
- **WebRTC** in-browser for audio + the `oai-events` data channel

## Project layout

```
prisma/
  schema.prisma          # Hotel, RoomType, Room, Reservation, Payment,
                         # MenuItem, RoomServiceOrder(+Item), LobbyMessage(+Reply), JourneyEvent
  seed.ts                # 4 room types, 12 rooms, 10 menu/concierge items
src/
  app/
    page.tsx             # Guest concierge experience (voice-first)
    admin/page.tsx       # Lobby Terminal dashboard + admin voice assistant
    api/
      realtime/customer/route.ts   # Mints ephemeral Realtime session for the guest
      realtime/admin/route.ts      # Mints ephemeral Realtime session for staff (PIN-gated)
      agent-tool/route.ts          # Executes server-side tool calls from either agent
      rooms/route.ts               # GET room catalog
      availability/route.ts        # POST { check_in_date, check_out_date, party_size }
      reservations/route.ts        # GET reservations (and single by ?code=)
      orders/route.ts              # GET orders, PATCH to update status (admin)
      messages/route.ts            # GET lobby messages, POST to reply (admin)
      admin/dashboard/route.ts     # Composite dashboard payload
  components/                      # Voice orb, room card, transcript rail, checkout, etc.
  lib/
    agent-prompts.ts               # Customer + admin agent instructions
    agent-tools.ts                 # OpenAI tool/function definitions
    tool-handlers.ts               # Server-side implementations of every tool
    realtime-client.ts             # WebRTC + data-channel client
    use-realtime-voice.ts          # React hook that orchestrates the Realtime session
    db.ts, format.ts, cn.ts        # Helpers
```

## Voice journey

1. Guest taps the voice orb on `/`. The browser exchanges WebRTC SDP with OpenAI using a freshly minted ephemeral key.
2. Solenne greets the guest and calls `get_room_options`. The room cards animate in.
3. Guest asks about a room; Solenne calls `get_room_details` and the matching card lights up.
4. Guest gives dates and party size by voice; Solenne calls `check_availability`. The availability panel renders.
5. Guest agrees to book; Solenne calls `create_reservation_hold`. The polished checkout panel appears.
6. Guest says "confirm booking"; Solenne calls `confirm_checkout`. The receipt animates with the reservation code and room number.
7. Guest can then say things like *"order two coffees and a breakfast tray"* (`place_room_service_order`) or *"message the lobby that I'll need a late checkout"* (`send_lobby_message`). Both require the confirmed reservation code.
8. Every step is recorded as a `JourneyEvent` and surfaces both on the guest's journey rail and in the admin dashboard.

The admin terminal supports the same loop: it can `get_admin_dashboard`, `get_pending_orders`, `update_order_status`, `get_lobby_messages`, `reply_to_guest`, and `get_room_journey` — by voice or by clicking the dashboard controls.

## Checkout & payment policy

The checkout view is intentionally polished and customer-ready (cardholder name, card number, expiry, CVV fields, totals, "Confirm booking" voice prompt). Internally, however:

- No real payment processor is integrated (no Stripe, PayPal, Helcim, PowerTranz, etc.).
- The form fields are visual only. They are **not** sent to the server, **not** sent to OpenAI, and **not** logged.
- The server-side `confirm_checkout` tool stores only a synthesized `cardBrand`, the last four digits of a generated number, and an auth code, then marks the reservation `CONFIRMED` and assigns a free room.
- The admin dashboard surfaces only the last-4 digits — never full card numbers, CVVs, or expirations.

The wording on screen and from the assistant is always realistic ("Secure checkout", "Payment authorized", "Reservation confirmed"); it never describes itself as a demo / mock / placeholder.

## Security notes

- The `OPENAI_API_KEY` is referenced only in server routes (`/api/realtime/*`). The browser never sees it.
- `/admin` and admin tool calls require the `ADMIN_PIN` header (`x-admin-pin`).
- Room-service orders and lobby messages require a confirmed reservation code; the server verifies status before persisting.
- Orders are always routed to the room currently assigned to that reservation — a guest cannot order into another room.

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Create a Postgres database (Neon, Vercel Postgres, or Supabase).
3. In **Project → Settings → Environment Variables**, add:
   - `OPENAI_API_KEY`
   - `DATABASE_URL` (pooled) and `DIRECT_URL` (direct)
   - `ADMIN_PIN`
   - `NEXT_PUBLIC_USE_ROOM_IMAGES=1`
   - `NEXT_PUBLIC_APP_URL` = your `https://…vercel.app` URL
   - optional: `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_VOICE`, `OPENAI_REALTIME_SPEED`
4. Sync the schema and seed once (run locally with `.env` pointed at the prod DB, or from a one-off shell):
   ```bash
   npx prisma db push
   npm run seed
   ```
5. Deploy. `postinstall` runs `prisma generate` automatically; API routes use the Node runtime (required for Prisma). HTTPS is automatic, so the mic, WebRTC, and copy-to-clipboard all work.

> Note: a public URL means anyone can open `/` and start a (billed) OpenAI Realtime session. Add a gate or rate limit before sharing widely.

## What's internally simulated

This is an MVP. The following are intentionally lightweight or simulated:

- **Payments**: no real processor — checkout is internally approved, no sensitive card data is stored.
- **Realtime model**: defaults to `gpt-realtime-2`. If your account uses a different id, set `OPENAI_REALTIME_MODEL` (e.g. `gpt-realtime`).
- **Auth**: a single `ADMIN_PIN` gates the admin terminal. There is no per-user auth or guest account system.
- **Refresh**: client UIs poll the API every ~4 seconds. A production deployment would use websockets or server-sent events.

Everything else — the booking journey, reservation persistence, room assignment, room-service orders, lobby messaging, journey logging, and the dual voice agents — is fully wired up and runs against PostgreSQL.
