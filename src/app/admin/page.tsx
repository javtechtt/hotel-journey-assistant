"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StageAtmosphere } from "@/components/StageAtmosphere";
import { BreathingEdges } from "@/components/BreathingEdges";
import { VoiceDock } from "@/components/VoiceDock";
import { TranscriptRail } from "@/components/TranscriptRail";
import { AudioSink } from "@/components/AudioSink";
import { JourneyRail } from "@/components/JourneyRail";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useRealtimeVoice, type ToolCallEvent } from "@/lib/use-realtime-voice";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { JourneyEventWire } from "@/lib/wire-types";
import { POLL_INTERVAL_MS } from "@/lib/config";

type Dashboard = {
  totals: {
    reservations: number;
    active_stays: number;
    pending_orders: number;
    open_messages: number;
    reservations_today: number;
  };
  reservations: Array<{
    code: string;
    guest_name: string;
    status: string;
    room_type: string;
    room_number: string | null;
    check_in_date: string;
    check_out_date: string;
    nights: number;
    total_cents: number;
    card_brand: string | null;
    card_last4: string | null;
  }>;
  orders: Array<{
    id: string;
    room_number: string;
    reservation_code: string;
    guest_name: string;
    status: string;
    total_cents: number;
    items: Array<{ name: string; quantity: number; price_cents: number }>;
    created_at: string;
  }>;
  messages: Array<{
    id: string;
    room_number: string;
    reservation_code: string;
    guest_name: string;
    body: string;
    status: string;
    created_at: string;
    replies: Array<{ body: string; from_staff: boolean; at: string }>;
  }>;
  events: Array<{
    id: string;
    kind: string;
    label: string;
    at: string;
    reservation_code: string | null;
    room_number: string | null;
  }>;
};

const ORDER_FLOW = ["RECEIVED", "PREPARING", "EN_ROUTE", "DELIVERED"] as const;

// One guest's full workspace: their reservation plus every request and event.
type GuestGroup = {
  reservation: Dashboard["reservations"][number];
  orders: Dashboard["orders"];
  messages: Dashboard["messages"];
  events: JourneyEventWire[];
  pendingOrders: number;
  openMessages: number;
};

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authedPin, setAuthedPin] = useState<string | null>(null);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusCode, setFocusCode] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!authedPin) return;
    const res = await fetch("/api/admin/dashboard", { headers: { "x-admin-pin": authedPin } });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b?.error || `Dashboard error (${res.status})`);
      if (res.status === 401) setAuthedPin(null);
      return;
    }
    setDash((await res.json()) as Dashboard);
    setError(null);
  }, [authedPin]);

  useEffect(() => {
    if (!authedPin) return;
    fetchDashboard();
    const t = setInterval(fetchDashboard, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [authedPin, fetchDashboard]);

  // Group every reservation into a single guest "card" — its orders, front-desk
  // messages, and journey events — so staff see one focused workspace per guest
  // instead of three flat, mixed lists.
  const guests = useMemo<GuestGroup[]>(() => {
    if (!dash) return [];
    return dash.reservations.map((r) => {
      const orders = dash.orders.filter((o) => o.reservation_code === r.code);
      const messages = dash.messages.filter((m) => m.reservation_code === r.code);
      const events = dash.events
        .filter((e) => e.reservation_code === r.code)
        .slice()
        .reverse();
      return {
        reservation: r,
        orders,
        messages,
        events,
        pendingOrders: orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status)).length,
        openMessages: messages.filter((m) => m.status === "OPEN").length
      };
    });
  }, [dash]);
  const selected = useMemo(
    () => guests.find((g) => g.reservation.code === focusCode) ?? null,
    [guests, focusCode]
  );

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!authedPin) return;
    await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-pin": authedPin },
      body: JSON.stringify({ order_id: orderId, status })
    });
    fetchDashboard();
  };
  const deleteReservation = async (code: string) => {
    if (!authedPin) return;
    if (
      !window.confirm(
        `Delete reservation ${code}? This permanently removes its orders, messages, and journey history. This cannot be undone.`
      )
    ) {
      return;
    }
    await fetch(`/api/reservations?code=${encodeURIComponent(code)}`, {
      method: "DELETE",
      headers: { "x-admin-pin": authedPin }
    });
    if (focusCode === code) setFocusCode(null);
    fetchDashboard();
  };
  const replyToMessage = async (messageId: string, body: string) => {
    if (!authedPin || !body.trim()) return;
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-pin": authedPin },
      body: JSON.stringify({ message_id: messageId, body: body.trim() })
    });
    fetchDashboard();
  };

  const onToolCall = useCallback(
    async (call: ToolCallEvent) => {
      const res = await fetch("/api/agent-tool", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authedPin ? { "x-admin-pin": authedPin } : {})
        },
        body: JSON.stringify({ agent: "admin", tool: call.name, args: call.arguments })
      });
      const body = await res.json();
      fetchDashboard();
      return body;
    },
    [authedPin, fetchDashboard]
  );

  const voice = useRealtimeVoice({
    agent: "admin",
    adminPin: authedPin || undefined,
    initialGreeting:
      "Greet the desk staff in one short sentence, then call get_admin_dashboard and give a one-line summary.",
    onToolCall
  });

  // ---- Sign-in ----
  if (!authedPin) {
    return (
      <main className="relative grid min-h-screen place-items-center px-6">
        <StageAtmosphere aurora={["rgba(212,167,59,0.4)", "rgba(99,102,241,0.32)"]} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setAuthedPin(pin);
          }}
          className="relative z-10 w-full max-w-md rounded-[2rem] glass-strong p-9 text-center"
        >
          <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-gold-400/30 text-gold-200">
            <Icon name="key" className="h-5 w-5" />
          </div>
          <div className="text-[11px] uppercase tracking-luxe text-gold-200/80">Lobby Terminal</div>
          <h1 className="font-display text-4xl text-gold mt-2">Maison Solenne</h1>
          <p className="mt-2 text-sm text-sand-100/60">Enter your desk PIN to open operations.</p>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            inputMode="numeric"
            className="mt-6 w-full rounded-xl border border-white/10 bg-black/30 py-4 text-center text-2xl tracking-[1em] text-sand-100 focus:border-gold-400/60 focus:outline-none"
          />
          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-gold-sheen py-3 text-sm font-semibold uppercase tracking-wider text-ink-900"
          >
            Enter terminal
          </button>
          {error && <div className="mt-4 text-xs text-rose-300">{error}</div>}
          <a href="/" className="mt-6 block text-[11px] uppercase tracking-[0.3em] text-white/35 hover:text-gold-200">
            Back to concierge
          </a>
        </form>
      </main>
    );
  }

  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden pb-40">
      <StageAtmosphere aurora={["rgba(212,167,59,0.32)", "rgba(99,102,241,0.28)"]} />
      <BreathingEdges levelRef={voice.levelRef} status={voice.status} />
      <AudioSink stream={voice.audioStream} />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1480px] flex-1 flex-col px-6 pt-6 lg:px-10">
        <header className="flex shrink-0 items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-luxe text-gold-200/70">Lobby Terminal</div>
            <h1 className="font-display text-3xl text-gold mt-0.5">Operations</h1>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="text-[11px] uppercase tracking-[0.28em] text-white/35 hover:text-gold-200">
              Concierge
            </a>
            <button onClick={() => setAuthedPin(null)} className="text-[11px] uppercase tracking-[0.28em] text-white/35 hover:text-rose-300">
              Sign out
            </button>
          </div>
        </header>

        {/* summary */}
        <section className="mt-5 grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat icon="key" label="Active stays" value={dash?.totals.active_stays ?? 0} />
          <Stat icon="calendar" label="Today" value={dash?.totals.reservations_today ?? 0} />
          <Stat icon="compass" label="Reservations" value={dash?.totals.reservations ?? 0} />
          <Stat icon="bell" label="Pending orders" value={dash?.totals.pending_orders ?? 0} />
          <Stat icon="chat" label="Open messages" value={dash?.totals.open_messages ?? 0} />
        </section>

        <div className="mt-6 grid min-h-0 flex-1 gap-6 lg:grid-cols-[1fr,320px]">
          {/* guest cards — one focused workspace per guest */}
          <div className="min-h-0 overflow-y-auto scrollbar-thin pr-1">
            {guests.length === 0 ? (
              <div className="grid h-full place-items-center">
                <Empty text="No reservations yet." />
              </div>
            ) : (
              <div className="grid auto-rows-min gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {guests.map((g) => (
                  <GuestCard key={g.reservation.code} guest={g} onOpen={() => setFocusCode(g.reservation.code)} />
                ))}
              </div>
            )}
          </div>

          {/* right rail — live voice transcript */}
          <aside className="hidden min-h-0 flex-col lg:flex">
            <div className="glass flex min-h-0 flex-1 flex-col rounded-[1.75rem] p-6">
              <div className="mb-4 inline-flex shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-200/70">
                <Icon name="mic" className="h-4 w-4" /> Voice terminal
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                <TranscriptRail turns={voice.transcript} />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* full-screen guest workspace */}
      <AnimatePresence>
        {selected && (
          <GuestModal
            key={selected.reservation.code}
            guest={selected}
            onClose={() => setFocusCode(null)}
            onUpdateOrder={updateOrderStatus}
            onReply={replyToMessage}
            onDelete={deleteReservation}
          />
        )}
      </AnimatePresence>

      <VoiceDock
        status={voice.status}
        error={voice.error}
        muted={voice.muted}
        onStart={voice.start}
        onStop={voice.stop}
        onToggleMute={voice.toggleMute}
        size={108}
      />
    </main>
  );
}

function Stat({ icon, label, value }: { icon: IconName; label: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.25em] text-white/45">{label}</span>
        <span className="text-gold-200/70"><Icon name={icon} className="h-4 w-4" /></span>
      </div>
      <div className="mt-1.5 font-display text-2xl text-sand-100">{value}</div>
    </div>
  );
}
function Section({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-200/70">
        <Icon name={icon} className="h-4 w-4" /> {title}
      </div>
      {children}
    </div>
  );
}

// A single guest's mini dashboard in the grid — status + request counts at a
// glance; click to open the full workspace.
function GuestCard({ guest, onOpen }: { guest: GuestGroup; onOpen: () => void }) {
  const { reservation: r, orders, messages, pendingOrders, openMessages } = guest;
  const attention = pendingOrders > 0 || openMessages > 0;
  return (
    <button
      onClick={onOpen}
      className={cn(
        "glass flex w-full flex-col gap-3 rounded-2xl border p-5 text-left transition hover:border-gold-400/40",
        attention ? "border-gold-400/40 ring-1 ring-gold-400/20" : "border-white/8"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-display text-xl text-sand-100">{r.guest_name}</div>
          <div className="mt-0.5 truncate text-xs text-white/55">
            {r.room_number ? `Room ${r.room_number}` : "Unassigned"} · {r.room_type}
          </div>
        </div>
        <StatusPill status={r.status} />
      </div>
      <div className="flex items-center justify-between text-xs text-white/55">
        <span>
          {formatDate(r.check_in_date)} → {formatDate(r.check_out_date)}
        </span>
        <span className="text-gold">{formatMoney(r.total_cents)}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <CardBadge
          icon="bell"
          label={`${orders.length} ${orders.length === 1 ? "order" : "orders"}`}
          active={pendingOrders > 0}
          count={pendingOrders}
        />
        <CardBadge
          icon="chat"
          label={`${messages.length} ${messages.length === 1 ? "message" : "messages"}`}
          active={openMessages > 0}
          count={openMessages}
        />
        <span className="ml-auto font-mono text-[11px] text-gold/70">{r.code}</span>
      </div>
    </button>
  );
}
function CardBadge({
  icon,
  label,
  active,
  count
}: {
  icon: IconName;
  label: string;
  active: boolean;
  count: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
        active ? "border-gold-400/40 bg-gold-500/10 text-gold-200" : "border-white/10 text-white/50"
      )}
    >
      <Icon name={icon} className="h-3.5 w-3.5" /> {label}
      {active && count > 0 && (
        <span className="ml-0.5 rounded-full bg-gold-sheen px-1.5 text-[10px] font-semibold text-ink-900">
          {count}
        </span>
      )}
    </span>
  );
}

// One room-service order with its status-advance controls (used in the modal).
function OrderCard({
  order,
  onUpdate
}: {
  order: Dashboard["orders"][number];
  onUpdate: (id: string, status: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-sand-100">
          {order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
        </div>
        <div className="shrink-0 text-gold">{formatMoney(order.total_cents)}</div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {ORDER_FLOW.map((step) => {
          const reached = ORDER_FLOW.indexOf(order.status as (typeof ORDER_FLOW)[number]) >= ORDER_FLOW.indexOf(step);
          const current = order.status === step;
          return (
            <button
              key={step}
              onClick={() => onUpdate(order.id, step)}
              className={cn(
                "rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest transition",
                current
                  ? "border-gold-400 bg-gold-500/20 text-gold-200"
                  : reached
                  ? "border-gold-400/40 text-gold-200/70"
                  : "border-white/10 text-white/40 hover:border-white/30"
              )}
            >
              {step.replace("_", " ").toLowerCase()}
            </button>
          );
        })}
        <button
          onClick={() => onUpdate(order.id, "CANCELLED")}
          className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-rose-300/70 hover:border-rose-400/40"
        >
          cancel
        </button>
      </div>
    </div>
  );
}

// Full-screen workspace for one guest: every request, status, and journey event.
function GuestModal({
  guest,
  onClose,
  onUpdateOrder,
  onReply,
  onDelete
}: {
  guest: GuestGroup;
  onClose: () => void;
  onUpdateOrder: (id: string, status: string) => void;
  onReply: (id: string, body: string) => Promise<void>;
  onDelete: (code: string) => void;
}) {
  const { reservation: r, orders, messages, events } = guest;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] glass-strong"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-7 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl text-sand-100">{r.guest_name}</h2>
              <StatusPill status={r.status} />
            </div>
            <div className="mt-1 text-sm text-white/55">
              {r.room_number ? `Room ${r.room_number}` : "Unassigned"} · {r.room_type} ·{" "}
              <span className="font-mono text-gold/80">{r.code}</span>
            </div>
            <div className="mt-1 text-xs text-white/45">
              {formatDate(r.check_in_date)} → {formatDate(r.check_out_date)} · {r.nights}{" "}
              {r.nights === 1 ? "night" : "nights"} · {formatMoney(r.total_cents)}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => onDelete(r.code)}
              className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-rose-300/70 transition hover:border-rose-400/40 hover:text-rose-300"
            >
              delete
            </button>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/60 transition hover:text-white"
              aria-label="Close"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto scrollbar-thin px-7 py-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Section title="Room-service orders" icon="bell">
              {orders.length === 0 ? (
                <Empty text="No orders." />
              ) : (
                <div className="space-y-3">
                  {orders.map((o) => (
                    <OrderCard key={o.id} order={o} onUpdate={onUpdateOrder} />
                  ))}
                </div>
              )}
            </Section>
            <Section title="Front-desk messages" icon="chat">
              {messages.length === 0 ? (
                <Empty text="No messages." />
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => (
                    <MessageRow key={m.id} message={m} onReply={onReply} />
                  ))}
                </div>
              )}
            </Section>
          </div>
          <Section title="Journey" icon="compass">
            {events.length === 0 ? <Empty text="No journey events yet." /> : <JourneyRail events={events} />}
          </Section>
        </div>
      </motion.div>
    </motion.div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="text-sm italic text-white/40">{text}</div>;
}
function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    CONFIRMED: "border-teal-400/30 bg-teal-500/15 text-teal-200",
    HOLD: "border-amber-400/30 bg-amber-500/15 text-amber-200",
    CANCELLED: "border-rose-400/30 bg-rose-500/15 text-rose-200",
    CHECKED_OUT: "border-white/20 bg-white/10 text-white/60"
  };
  return (
    <span className={cn("inline-block rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-widest", map[status] ?? "border-white/10 bg-white/5 text-white/60")}>
      {status.replace("_", " ").toLowerCase()}
    </span>
  );
}
function MessageRow({
  message,
  onReply
}: {
  message: Dashboard["messages"][number];
  onReply: (id: string, body: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-white/40">
          Room {message.room_number} · {message.guest_name}
        </div>
        <div className={cn("text-[10px] uppercase tracking-widest", message.status === "OPEN" ? "text-amber-300" : "text-teal-300")}>
          {message.status === "OPEN" ? "needs reply" : "resolved"}
        </div>
      </div>
      <div className="mt-2 text-sm text-sand-100">{message.body}</div>
      {message.replies.map((r, i) => (
        <div key={i} className="mt-2 rounded-xl border border-gold-400/30 bg-gold-500/10 p-3 text-sm text-sand-100">
          <div className="mb-0.5 text-[9px] uppercase tracking-widest text-gold-200">Front desk</div>
          {r.body}
        </div>
      ))}
      {message.status === "OPEN" && (
        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Reply to guest…"
            className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-sand-100 placeholder:text-white/30 focus:border-gold-400/60 focus:outline-none"
          />
          <button
            onClick={async () => {
              await onReply(message.id, draft);
              setDraft("");
            }}
            className="rounded-xl bg-gold-sheen px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-ink-900"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
