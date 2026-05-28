"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { StageAtmosphere } from "@/components/StageAtmosphere";
import { BreathingEdges } from "@/components/BreathingEdges";
import { JourneyProgress, type JourneyStepKey } from "@/components/JourneyProgress";
import { VoiceDock } from "@/components/VoiceDock";
import { AudioSink } from "@/components/AudioSink";
import { WelcomeStage } from "@/components/stages/WelcomeStage";
import { DiscoveryStage } from "@/components/stages/DiscoveryStage";
import { CheckoutStage, type PaymentPrefill } from "@/components/stages/CheckoutStage";
import { ConfirmationStage } from "@/components/stages/ConfirmationStage";
import { ConciergeStage } from "@/components/stages/ConciergeStage";
import { RoomAmenitiesLightbox } from "@/components/RoomAmenitiesLightbox";
import { RequestsCart } from "@/components/RequestsCart";
import { StayCalendar } from "@/components/StayCalendar";
import { useRealtimeVoice, type ToolCallEvent } from "@/lib/use-realtime-voice";
import { roomVisual } from "@/lib/room-visuals";
import { formatDate } from "@/lib/format";
import { POLL_INTERVAL_MS } from "@/lib/config";
import {
  normalizeRoom,
  type AvailabilityWire,
  type LobbyMessageWire,
  type MenuItemWire,
  type OrderWire,
  type ReservationWire,
  type RoomTypeWire
} from "@/lib/wire-types";

type Stage = JourneyStepKey;

// A different atmospheric cue each session so the greeting never sounds scripted.
const GREETING_FLAVORS = [
  "a bright, sunlit morning welcome",
  "a warm golden-afternoon welcome",
  "a calm, candlelit evening welcome",
  "a gentle welcome that nods to the sea breeze",
  "an elegant welcome that notes the hush of the lobby",
  "an easy, gracious welcome as if to a returning friend"
];
function buildGreeting(): string {
  const flavor = GREETING_FLAVORS[Math.floor(Math.random() * GREETING_FLAVORS.length)];
  return `As Solenne, FIRST call get_session_state to see where the guest is. If they are just arriving (no reservation, at the very start), give ${flavor} to Maison Solenne in one short, fresh sentence, then call get_room_options and invite them to explore (don't describe the rooms). If they are already mid-journey, do NOT greet from scratch or restart — briefly pick up exactly where they are, per your resume guidance. No audible breaths; then stop and wait.`;
}

// Distinguishing words for each room type, used to detect when the assistant
// names a room in its streamed speech. Generic stopwords are dropped.
const KEYWORD_STOP = new Set(["room", "suite", "view", "king", "the", "and", "with", "your"]);
function roomTokens(rt: RoomTypeWire): string[] {
  const full = rt.name.toLowerCase();
  const toks = full.split(/\s+/).filter((t) => t.length >= 4 && !KEYWORD_STOP.has(t));
  return toks.length ? toks : [full];
}

export default function CustomerPage() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [rooms, setRooms] = useState<RoomTypeWire[]>([]);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityWire | null>(null);
  const [reservation, setReservation] = useState<ReservationWire | null>(null);
  const [menu, setMenu] = useState<MenuItemWire[]>([]);
  const [orders, setOrders] = useState<OrderWire[]>([]);
  const [messages, setMessages] = useState<LobbyMessageWire[]>([]);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  // Which room the assistant is currently naming out loud (live highlight).
  const [spokenSlug, setSpokenSlug] = useState<string | null>(null);
  // Opt-in features & amenities lightbox over the room stage.
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  // Voice-collected payment details (display-only; never stored server-side).
  const [paymentDraft, setPaymentDraft] = useState<PaymentPrefill>({});
  // Stay dates being collected (drives the live calendar during the room phase).
  const [stayDraft, setStayDraft] = useState<{
    check_in_date?: string;
    check_out_date?: string;
    party_size?: number;
  }>({});
  // The live calendar is shown the moment the agent starts asking for dates —
  // before any value is collected — so it does not wait for the guest's answer.
  const [calendarOpen, setCalendarOpen] = useState(false);
  // Live snapshot of the journey so the agent can resume via get_session_state
  // after the guest pauses/resumes the voice session — state is never reset by
  // stopping the audio, and is read from this store rather than guessed.
  const stateRef = useRef<{
    stage: Stage;
    reservation: ReservationWire | null;
    focusedSlug: string | null;
    hasAvailability: boolean;
  }>({ stage: "welcome", reservation: null, focusedSlug: null, hasAvailability: false });
  const mentionRef = useRef<{ turnId: string; counts: Record<string, number> }>({
    turnId: "",
    counts: {}
  });
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the resume snapshot current so get_session_state always reflects the
  // live screen (read inside the frozen tool dispatcher via the ref).
  useEffect(() => {
    stateRef.current = { stage, reservation, focusedSlug, hasAvailability: !!availability };
  }, [stage, reservation, focusedSlug, availability]);

  // Clear any spoken-room highlight when the stage changes, so nothing appears
  // pre-selected on arrival (e.g. a room named during the welcome greeting must
  // not carry a highlight into the discovery gallery).
  useEffect(() => {
    setSpokenSlug(null);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  }, [stage]);

  // ---- Initial room catalog (visual richness before voice connects) ----
  useEffect(() => {
    fetch("/api/rooms")
      .then((r) => r.json())
      .then((b) => setRooms((b.room_types || []).map(normalizeRoom)))
      .catch(() => {});
  }, []);

  // ---- Menu (for the concierge stage) ----
  useEffect(() => {
    if (stage !== "confirmed" && stage !== "concierge") return;
    if (menu.length > 0) return;
    fetch("/api/agent-tool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent: "customer", tool: "get_menu_items", args: {} })
    })
      .then((r) => r.json())
      .then((b) => {
        if (b?.ok && b.data?.items) setMenu(b.data.items as MenuItemWire[]);
      })
      .catch(() => {});
  }, [stage, menu.length]);

  // ---- Poll reservation / orders / messages (server-side truth) ----
  useEffect(() => {
    if (!reservation?.reservation_code) return;
    const code = reservation.reservation_code;
    const guest = reservation.guest_name;
    let t: any;
    const tick = async () => {
      try {
        const [resRes, ordersRes, msgsRes] = await Promise.all([
          fetch(`/api/reservations?code=${encodeURIComponent(code)}`),
          fetch(`/api/orders`),
          fetch(`/api/messages`)
        ]);
        if (resRes.ok) {
          const { reservation: r } = await resRes.json();
          if (r) {
            setReservation((prev) =>
              prev
                ? {
                    ...prev,
                    status: r.status,
                    room_number: r.room_number ?? prev.room_number,
                    card_brand: r.card_brand ?? prev.card_brand,
                    card_last4: r.card_last4 ?? prev.card_last4
                  }
                : prev
            );
          }
        }
        if (ordersRes.ok) {
          const { orders: list } = await ordersRes.json();
          setOrders(
            (list || [])
              .filter((o: any) => o.guest_name === guest)
              .map((o: any) => ({
                order_id: o.id,
                room_number: o.room_number,
                status: o.status,
                total_usd: o.total_cents / 100,
                items: o.items.map((i: any) => ({
                  name: i.name,
                  quantity: i.quantity,
                  price_usd: i.price_cents / 100
                }))
              }))
          );
        }
        if (msgsRes.ok) {
          const { messages: list } = await msgsRes.json();
          setMessages(
            (list || [])
              .filter((m: any) => m.guest_name === guest)
              .map((m: any) => ({
                message_id: m.id,
                room_number: m.room_number,
                body: m.body,
                status: m.status,
                replies: m.replies
              }))
          );
        }
      } catch {}
      t = setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();
    return () => clearTimeout(t);
  }, [reservation?.reservation_code, reservation?.guest_name]);

  // ---- Server-side tool execution + visual state choreography ----
  const onToolCall = useCallback(async (call: ToolCallEvent) => {
    // get_session_state is answered locally from the live snapshot — it is the
    // source of truth for where the guest is, so the agent resumes (never
    // resets) after the voice session is paused and reconnected.
    if (call.name === "get_session_state") {
      const s = stateRef.current;
      return {
        ok: true,
        data: {
          stage: s.stage,
          has_reservation: !!s.reservation,
          reservation: s.reservation
            ? {
                reservation_code: s.reservation.reservation_code,
                guest_name: s.reservation.guest_name,
                room_type: s.reservation.room_type,
                status: s.reservation.status,
                room_number: s.reservation.room_number ?? null
              }
            : null,
          focused_room: s.focusedSlug ?? null
        }
      };
    }

    // go_to_stage navigates the on-screen view (with guards) so "take me back
    // to the rooms / checkout / concierge" actually changes the screen.
    if (call.name === "go_to_stage") {
      const raw = String((call.arguments as any).stage || "").toLowerCase();
      const s = stateRef.current;
      const hold = s.reservation?.status === "HOLD";
      const confirmed = s.reservation?.status === "CONFIRMED";
      let dest: Stage | null = null;
      if (/welcome|start|home|beginning/.test(raw)) dest = "welcome";
      else if (/concierge|service|lobby|menu|front.?desk|order/.test(raw)) dest = confirmed ? "concierge" : null;
      else if (/confirm|receipt/.test(raw)) dest = confirmed ? "confirmed" : null;
      else if (/checkout|payment|\bpay\b/.test(raw)) dest = hold ? "checkout" : null;
      // Dates now live within the room view — "the dates" returns to the rooms.
      else if (/avail|date/.test(raw)) dest = s.focusedSlug ? "roomDetail" : "discovery";
      else if (/detail|selected/.test(raw)) dest = s.focusedSlug ? "roomDetail" : "discovery";
      else if (/discover|room|browse|collection|gallery|stay/.test(raw)) dest = "discovery";
      if (dest) {
        setAmenitiesOpen(false);
        setStage(dest);
        return { ok: true, data: { navigated_to: dest } };
      }
      return { ok: false, error: "That section isn't available from here yet." };
    }

    // begin_date_selection just opens the empty calendar the instant the agent
    // starts asking for dates — no value needed yet.
    if (call.name === "begin_date_selection") {
      setCalendarOpen(true);
      setAmenitiesOpen(false);
      return { ok: true, data: { acknowledged: true } };
    }

    // set_stay_details is answered locally — it just fills the live calendar as
    // the agent collects dates (merges partial values).
    if (call.name === "set_stay_details") {
      const a = call.arguments;
      setStayDraft((prev) => ({
        check_in_date: (a.check_in_date as string) ?? prev.check_in_date,
        check_out_date: (a.check_out_date as string) ?? prev.check_out_date,
        party_size: (a.party_size as number) ?? prev.party_size
      }));
      setCalendarOpen(true);
      setAmenitiesOpen(false);
      return { ok: true, data: { acknowledged: true } };
    }

    const res = await fetch("/api/agent-tool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent: "customer", tool: call.name, args: call.arguments })
    });
    const body = await res.json();

    try {
      if (body.ok) {
        const d = body.data as any;
        switch (call.name) {
          case "get_room_options":
            if (d?.room_types) setRooms(d.room_types.map(normalizeRoom));
            // Showing the rooms means going to the discovery gallery.
            setAmenitiesOpen(false);
            setStage("discovery");
            break;
          case "get_room_details":
            if (d?.room_type) {
              setFocusedSlug(d.room_type.slug);
              setStage("roomDetail");
              setAmenitiesOpen(false);
            }
            break;
          case "show_room_amenities":
            if (d?.room_type) {
              setFocusedSlug(d.room_type.slug);
              setStage("roomDetail");
              setAmenitiesOpen(true);
            }
            break;
          case "close_room_details":
            setAmenitiesOpen(false);
            break;
          case "set_payment_details": {
            const draft: PaymentPrefill = {
              card_name: call.arguments.card_name as string | undefined,
              card_number: call.arguments.card_number as string | undefined,
              expiry: call.arguments.expiry as string | undefined,
              cvv: call.arguments.cvv as string | undefined
            };
            setPaymentDraft(draft);
            break;
          }
          case "resume_reservation":
            if (d?.reservation) {
              setReservation(d.reservation as ReservationWire);
              setStage("concierge");
            }
            break;
          case "check_availability":
            if (d) {
              // No separate availability screen — the result is shown inline on
              // the room being viewed (its "X available" / "Sold out" badge), so
              // the guest stays in the room dialogue.
              setAvailability(d as AvailabilityWire);
              setStayDraft({});
              setCalendarOpen(false);
            }
            break;
          case "create_reservation_hold":
            if (d) {
              setReservation({
                reservation_code: d.reservation_code,
                guest_name: d.guest_name,
                room_type: d.room_type,
                room_type_slug: d.room_type_slug,
                check_in_date: d.check_in_date,
                check_out_date: d.check_out_date,
                nights: d.nights,
                party_size: d.party_size,
                nightly_rate_usd: d.nightly_rate_usd,
                subtotal_usd: d.subtotal_usd,
                taxes_usd: d.taxes_usd,
                total_usd: d.total_usd,
                status: "HOLD"
              });
              if (d.room_type_slug) setFocusedSlug(d.room_type_slug);
              setStage("checkout");
            }
            break;
          case "modify_reservation_hold":
            if (d) {
              setReservation({
                reservation_code: d.reservation_code,
                guest_name: d.guest_name,
                room_type: d.room_type,
                room_type_slug: d.room_type_slug,
                check_in_date: d.check_in_date,
                check_out_date: d.check_out_date,
                nights: d.nights,
                party_size: d.party_size,
                nightly_rate_usd: d.nightly_rate_usd,
                subtotal_usd: d.subtotal_usd,
                taxes_usd: d.taxes_usd,
                total_usd: d.total_usd,
                status: "HOLD"
              });
              if (d.room_type_slug) setFocusedSlug(d.room_type_slug);
              setStage("checkout");
            }
            break;
          case "cancel_reservation":
            if (d) {
              setReservation(null);
              setAvailability(null);
              setAmenitiesOpen(false);
              setPaymentDraft({});
              setStayDraft({});
              setCalendarOpen(false);
              setStage("discovery");
            }
            break;
          case "confirm_checkout":
            if (d) {
              setIsProcessingCheckout(true);
              // Use the server-stored card metadata so the receipt matches the
              // admin/payment record exactly.
              setReservation((prev) =>
                prev
                  ? {
                      ...prev,
                      status: "CONFIRMED",
                      room_number: d.room_number,
                      card_brand: d.card_brand,
                      card_last4: d.card_last4
                    }
                  : prev
              );
              setTimeout(() => {
                setIsProcessingCheckout(false);
                setStage("confirmed");
              }, 1500);
            }
            break;
          case "get_menu_items":
            if (Array.isArray(d?.items)) setMenu(d.items as MenuItemWire[]);
            // Showing the menu means opening the concierge area (post-booking).
            if (stateRef.current.reservation?.status === "CONFIRMED") setStage("concierge");
            break;
          case "place_room_service_order":
            if (d) setStage("concierge");
            break;
          case "send_lobby_message":
            if (d) setStage("concierge");
            break;
        }
      }
    } catch {}

    return body;
  }, []);

  const initialGreeting = useMemo(buildGreeting, []);

  const voice = useRealtimeVoice({
    agent: "customer",
    initialGreeting,
    onToolCall
  });

  const focusedRoom = useMemo(
    () => rooms.find((r) => r.slug === focusedSlug) ?? null,
    [rooms, focusedSlug]
  );

  // The details lightbox only belongs on the room stage.
  useEffect(() => {
    if (stage !== "roomDetail") setAmenitiesOpen(false);
  }, [stage]);

  // The live calendar belongs to the date-collection phase (room browsing /
  // focus); drop it once the journey moves on (availability, checkout, etc.).
  useEffect(() => {
    if (stage !== "roomDetail" && stage !== "discovery") setCalendarOpen(false);
  }, [stage]);

  const availabilityLabelForFocused = useMemo(() => {
    if (!availability || !focusedSlug) return undefined;
    const a = availability.availability.find((x) => x.slug === focusedSlug);
    if (!a) return undefined;
    return a.rooms_available > 0 ? `${a.rooms_available} available` : "Sold out";
  }, [availability, focusedSlug]);

  // Once dates are chosen the calendar closes, so the focused room carries the
  // stay (dates + guests) as a chip — keeping dates part of the room dialogue.
  const stayLabelForFocused = useMemo(() => {
    if (!availability) return undefined;
    const { check_in_date, check_out_date, party_size } = availability;
    return `${formatDate(check_in_date)} – ${formatDate(check_out_date)} · ${party_size} ${
      party_size === 1 ? "guest" : "guests"
    }`;
  }, [availability]);

  const aurora = roomVisual(focusedSlug ?? reservation?.room_type_slug).aurora;

  // Live highlight: highlight a room only at the moment the assistant *newly*
  // names it (a mention count increases) while it is actively speaking — then
  // fade. This keeps the highlight in sync with the spoken name rather than
  // staying lit for the whole turn.
  useEffect(() => {
    if (rooms.length === 0) return;
    let turn: { id: string; text: string } | undefined;
    for (let i = voice.transcript.length - 1; i >= 0; i--) {
      if (voice.transcript[i].role === "assistant") {
        turn = voice.transcript[i];
        break;
      }
    }
    if (!turn) return;
    const text = turn.text.toLowerCase();
    if (mentionRef.current.turnId !== turn.id) {
      mentionRef.current = { turnId: turn.id, counts: {} };
    }

    let fired: string | null = null;
    let firedIdx = -1;
    for (const rt of rooms) {
      let count = 0;
      let lastIdx = -1;
      for (const tok of roomTokens(rt)) {
        const occ = text.split(tok).length - 1;
        count += occ;
        if (occ > 0) lastIdx = Math.max(lastIdx, text.lastIndexOf(tok));
      }
      const prev = mentionRef.current.counts[rt.slug] ?? 0;
      if (count > prev && lastIdx > firedIdx) {
        fired = rt.slug;
        firedIdx = lastIdx;
      }
      mentionRef.current.counts[rt.slug] = count;
    }

    if (fired && voice.status === "speaking") {
      setSpokenSlug(fired);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setSpokenSlug(null), 1500);
    }
  }, [voice.transcript, voice.status, rooms]);

  // Safety: clear the highlight shortly after speech ends.
  useEffect(() => {
    if (voice.status === "speaking") return;
    const t = setTimeout(() => setSpokenSlug(null), 600);
    return () => clearTimeout(t);
  }, [voice.status]);

  // Note: room selection is driven ONLY by tool calls (get_room_details /
  // show_room_amenities) — the system is the source of truth. The spoken-word
  // heuristic is used solely for the transient highlight on the discovery
  // gallery, never to change the showcased room.

  // Local (clickable) navigation that mirrors the voice journey for testing.
  const selectRoomLocally = useCallback((slug: string) => {
    setFocusedSlug(slug);
    setStage("roomDetail");
  }, []);

  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden">
      <StageAtmosphere aurora={aurora} />
      <BreathingEdges levelRef={voice.levelRef} status={voice.status} />
      <AudioSink stream={voice.audioStream} />

      {/* top bar */}
      <div className="relative z-30 flex shrink-0 items-center justify-between px-6 pt-5 lg:px-10">
        <div className="text-[11px] uppercase tracking-[0.32em] text-gold-200/70">Maison Solenne</div>
        <div className="hidden md:block">
          <JourneyProgress active={stage} />
        </div>
        <a href="/admin" className="text-[11px] uppercase tracking-[0.28em] text-white/35 transition hover:text-gold-200">
          Lobby Terminal
        </a>
      </div>

      {/* stage area — fills the remaining height; no page scroll */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col px-4 pb-44 pt-4 sm:pb-40 lg:px-8">
        <AnimatePresence mode="wait">
          {stage === "welcome" && <WelcomeStage key="welcome" />}

          {(stage === "discovery" || stage === "roomDetail") && (
            <DiscoveryStage
              key="discovery"
              rooms={rooms}
              focusedSlug={focusedSlug}
              highlightSlug={stage === "discovery" ? spokenSlug : null}
              focusMode={stage === "roomDetail"}
              availabilityLabel={availabilityLabelForFocused}
              stayLabel={stayLabelForFocused}
              onSelect={selectRoomLocally}
              onClose={() => setStage("discovery")}
            />
          )}

          {stage === "checkout" && reservation && (
            <CheckoutStage
              key="checkout"
              reservation={reservation}
              isProcessing={isProcessingCheckout}
              prefill={paymentDraft}
            />
          )}

          {stage === "confirmed" && reservation && (
            <ConfirmationStage
              key="confirmed"
              reservation={reservation}
              onContinue={() => setStage("concierge")}
            />
          )}

          {stage === "concierge" && reservation && (
            <ConciergeStage key="concierge" reservation={reservation} menu={menu} />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {amenitiesOpen && focusedRoom && (
          <RoomAmenitiesLightbox rt={focusedRoom} onClose={() => setAmenitiesOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {calendarOpen && (stage === "roomDetail" || stage === "discovery") && (
          <StayCalendar
            checkIn={stayDraft.check_in_date}
            checkOut={stayDraft.check_out_date}
            partySize={stayDraft.party_size}
            onClose={() => {
              setStayDraft({});
              setCalendarOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Pending-requests cart — every room-service & front-desk request, with
          live status, once the guest has a confirmed reservation. */}
      {reservation?.status === "CONFIRMED" && (
        <RequestsCart orders={orders} messages={messages} />
      )}

      <VoiceDock
        status={voice.status}
        error={voice.error}
        muted={voice.muted}
        onStart={voice.start}
        onStop={voice.stop}
        onToggleMute={voice.toggleMute}
      />
    </main>
  );
}
