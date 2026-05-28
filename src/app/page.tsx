"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { StageAtmosphere } from "@/components/StageAtmosphere";
import { JourneyProgress, type JourneyStepKey } from "@/components/JourneyProgress";
import { VoiceDock } from "@/components/VoiceDock";
import { AudioSink } from "@/components/AudioSink";
import { WelcomeStage } from "@/components/stages/WelcomeStage";
import { DiscoveryStage } from "@/components/stages/DiscoveryStage";
import { AvailabilityStage } from "@/components/stages/AvailabilityStage";
import { CheckoutStage } from "@/components/stages/CheckoutStage";
import { ConfirmationStage } from "@/components/stages/ConfirmationStage";
import { ConciergeStage } from "@/components/stages/ConciergeStage";
import { useRealtimeVoice, type ToolCallEvent } from "@/lib/use-realtime-voice";
import { roomVisual } from "@/lib/room-visuals";
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

const STAGE_HINTS: Record<Stage, string> = {
  welcome: "Tap the orb and say “show me your rooms.”",
  discovery: "Try “tell me about the ocean view suite.”",
  roomDetail: "Say “check availability” or “reserve this room.”",
  availability: "Give me your dates, then say “reserve this.”",
  checkout: "Say “confirm booking” when you’re ready.",
  confirmed: "Say “order room service” or “message the lobby.”",
  concierge: "Try “send two coffees to my room.”"
};

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
  const mentionRef = useRef<{ turnId: string; counts: Record<string, number> }>({
    turnId: "",
    counts: {}
  });
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      t = setTimeout(tick, 4000);
    };
    tick();
    return () => clearTimeout(t);
  }, [reservation?.reservation_code, reservation?.guest_name]);

  // ---- Server-side tool execution + visual state choreography ----
  const onToolCall = useCallback(async (call: ToolCallEvent) => {
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
            setStage((s) => (s === "welcome" || s === "concierge" ? "discovery" : s));
            break;
          case "get_room_details":
            if (d?.room_type) {
              setFocusedSlug(d.room_type.slug);
              setStage("roomDetail");
            }
            break;
          case "check_availability":
            if (d) {
              setAvailability(d as AvailabilityWire);
              setStage("availability");
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
          case "confirm_checkout":
            if (d) {
              setIsProcessingCheckout(true);
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

  const voice = useRealtimeVoice({
    agent: "customer",
    initialGreeting:
      "Warmly welcome the guest to Maison Solenne as Solenne — bright, friendly, and unhurried but lively, one or two short sentences that make them feel looked-after. Then call get_room_options and invite them to explore, mentioning two or three styles by name with a touch of charm.",
    onToolCall
  });

  const availabilityLabelForFocused = useMemo(() => {
    if (!availability || !focusedSlug) return undefined;
    const a = availability.availability.find((x) => x.slug === focusedSlug);
    if (!a) return undefined;
    return a.rooms_available > 0 ? `${a.rooms_available} available` : "Sold out";
  }, [availability, focusedSlug]);

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

  // Local (clickable) navigation that mirrors the voice journey for testing.
  const selectRoomLocally = useCallback((slug: string) => {
    setFocusedSlug(slug);
    setStage("roomDetail");
  }, []);

  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden">
      <StageAtmosphere aurora={aurora} />
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
      <div className="relative z-10 mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col px-4 pb-40 pt-4 lg:px-8">
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
              onSelect={selectRoomLocally}
              onClose={() => setStage("discovery")}
            />
          )}

          {stage === "availability" && availability && (
            <AvailabilityStage key="availability" data={availability} focusedSlug={focusedSlug} />
          )}

          {stage === "checkout" && reservation && (
            <CheckoutStage key="checkout" reservation={reservation} isProcessing={isProcessingCheckout} />
          )}

          {stage === "confirmed" && reservation && (
            <ConfirmationStage
              key="confirmed"
              reservation={reservation}
              onContinue={() => setStage("concierge")}
            />
          )}

          {stage === "concierge" && reservation && (
            <ConciergeStage
              key="concierge"
              reservation={reservation}
              menu={menu}
              orders={orders}
              messages={messages}
            />
          )}
        </AnimatePresence>
      </div>

      <VoiceDock
        status={voice.status}
        error={voice.error}
        transcript={voice.transcript}
        muted={voice.muted}
        hint={STAGE_HINTS[stage]}
        onStart={voice.start}
        onStop={voice.stop}
        onToggleMute={voice.toggleMute}
      />
    </main>
  );
}
