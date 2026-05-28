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
    guest_name: string;
    status: string;
    total_cents: number;
    items: Array<{ name: string; quantity: number; price_cents: number }>;
    created_at: string;
  }>;
  messages: Array<{
    id: string;
    room_number: string;
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
    const t = setInterval(fetchDashboard, 4000);
    return () => clearInterval(t);
  }, [authedPin, fetchDashboard]);

  const focusReservation = useMemo(
    () => dash?.reservations.find((r) => r.code === focusCode) ?? null,
    [dash, focusCode]
  );
  const focusEvents = useMemo<JourneyEventWire[]>(() => {
    if (!dash || !focusCode) return [];
    return dash.events.filter((e) => e.reservation_code === focusCode).slice().reverse();
  }, [dash, focusCode]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!authedPin) return;
    await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-pin": authedPin },
      body: JSON.stringify({ order_id: orderId, status })
    });
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
    <main className="relative min-h-screen pb-44">
      <StageAtmosphere aurora={["rgba(212,167,59,0.32)", "rgba(99,102,241,0.28)"]} />
      <BreathingEdges levelRef={voice.levelRef} status={voice.status} />
      <AudioSink stream={voice.audioStream} />

      <div className="relative z-10 mx-auto max-w-[1480px] px-6 pt-8 lg:px-10">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-luxe text-gold-200/70">Lobby Terminal</div>
            <h1 className="font-display text-4xl text-gold mt-1">Operations</h1>
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
        <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Stat icon="key" label="Active stays" value={dash?.totals.active_stays ?? 0} />
          <Stat icon="calendar" label="Today" value={dash?.totals.reservations_today ?? 0} />
          <Stat icon="compass" label="Reservations" value={dash?.totals.reservations ?? 0} />
          <Stat icon="bell" label="Pending orders" value={dash?.totals.pending_orders ?? 0} />
          <Stat icon="chat" label="Open messages" value={dash?.totals.open_messages ?? 0} />
        </section>

        <div className="mt-8 grid gap-7 lg:grid-cols-[1.9fr,1fr]">
          <div className="space-y-7">
            {/* reservations */}
            <Panel title="Reservations" icon="compass">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                      <th className="px-3 py-2 text-left font-normal">Code</th>
                      <th className="px-3 py-2 text-left font-normal">Guest</th>
                      <th className="px-3 py-2 text-left font-normal">Room</th>
                      <th className="px-3 py-2 text-left font-normal">Stay</th>
                      <th className="px-3 py-2 text-left font-normal">Status</th>
                      <th className="px-3 py-2 text-right font-normal">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dash?.reservations.map((r) => (
                      <tr
                        key={r.code}
                        onClick={() => setFocusCode(r.code)}
                        className={cn(
                          "cursor-pointer border-t border-white/5 transition hover:bg-white/[0.03]",
                          focusCode === r.code && "bg-gold-500/10"
                        )}
                      >
                        <td className="px-3 py-3 font-mono text-gold">{r.code}</td>
                        <td className="px-3 py-3 text-sand-100">{r.guest_name}</td>
                        <td className="px-3 py-3 text-white/80">
                          {r.room_number ?? "—"} <span className="text-white/40">· {r.room_type}</span>
                        </td>
                        <td className="px-3 py-3 text-white/70">
                          {formatDate(r.check_in_date)} → {formatDate(r.check_out_date)}
                        </td>
                        <td className="px-3 py-3"><StatusPill status={r.status} /></td>
                        <td className="px-3 py-3 text-right text-sand-100">{formatMoney(r.total_cents)}</td>
                      </tr>
                    ))}
                    {(dash?.reservations.length ?? 0) === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-sm italic text-white/40">
                          No reservations yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* orders */}
            <Panel title="Room-service orders" icon="bell">
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {dash?.orders.map((o) => (
                    <motion.div
                      key={o.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-2xl border border-white/8 bg-black/20 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-sand-100">
                          Room {o.room_number} <span className="text-white/40">· {o.guest_name}</span>
                        </div>
                        <div className="text-gold">{formatMoney(o.total_cents)}</div>
                      </div>
                      <div className="mt-1 text-xs text-white/55">
                        {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {ORDER_FLOW.map((step) => {
                          const reached = ORDER_FLOW.indexOf(o.status as any) >= ORDER_FLOW.indexOf(step);
                          const current = o.status === step;
                          return (
                            <button
                              key={step}
                              onClick={() => updateOrderStatus(o.id, step)}
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
                          onClick={() => updateOrderStatus(o.id, "CANCELLED")}
                          className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-rose-300/70 hover:border-rose-400/40"
                        >
                          cancel
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {(dash?.orders.length ?? 0) === 0 && <Empty text="No active orders." />}
              </div>
            </Panel>

            {/* messages */}
            <Panel title="Front-desk messages" icon="chat">
              <div className="space-y-3">
                {dash?.messages.map((m) => (
                  <MessageRow key={m.id} message={m} onReply={replyToMessage} />
                ))}
                {(dash?.messages.length ?? 0) === 0 && <Empty text="No messages yet." />}
              </div>
            </Panel>
          </div>

          {/* right rail */}
          <aside className="space-y-7">
            <Panel title="Voice terminal" icon="mic">
              <TranscriptRail turns={voice.transcript} />
            </Panel>
            <Panel
              title={focusReservation ? `Journey · ${focusReservation.code}` : "Journey timeline"}
              icon="compass"
            >
              {focusReservation ? (
                <JourneyRail events={focusEvents} />
              ) : (
                <Empty text="Select a reservation to inspect its journey." />
              )}
            </Panel>
          </aside>
        </div>
      </div>

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
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.25em] text-white/45">{label}</span>
        <span className="text-gold-200/70"><Icon name={icon} className="h-4 w-4" /></span>
      </div>
      <div className="mt-3 font-display text-4xl text-sand-100">{value}</div>
    </div>
  );
}
function Panel({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  return (
    <div className="glass rounded-[1.75rem] p-6">
      <div className="mb-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-200/70">
        <Icon name={icon} className="h-4 w-4" /> {title}
      </div>
      {children}
    </div>
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
