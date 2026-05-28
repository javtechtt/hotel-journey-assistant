"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import type { LobbyMessageWire, OrderWire } from "@/lib/wire-types";

const ORDER_FLOW: Array<OrderWire["status"]> = ["RECEIVED", "PREPARING", "EN_ROUTE", "DELIVERED"];

// Friendly status labels for the cart chips.
const ORDER_STATUS_LABEL: Record<OrderWire["status"], string> = {
  RECEIVED: "Received",
  PREPARING: "In progress",
  EN_ROUTE: "On its way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled"
};

// A single floating "pending requests" cart. Every room-service order and
// front-desk request the guest has made lands here, each with a live status —
// a clearer, organized view than scrolling through chat-style messages. The
// backend flow is unchanged; this is purely how requests are presented.
export function RequestsCart({
  orders,
  messages
}: {
  orders: OrderWire[];
  messages: LobbyMessageWire[];
}) {
  const [open, setOpen] = useState(false);
  const count = orders.length + messages.length;

  return (
    <div className="pointer-events-none fixed bottom-7 right-5 z-40 flex flex-col items-end sm:right-8">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="pointer-events-auto mb-3 flex max-h-[70vh] w-[20rem] flex-col overflow-hidden rounded-[1.75rem] glass-strong sm:w-[22rem]"
          >
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-200/80">
                <Icon name="bag" className="h-4 w-4" /> Your requests
              </div>
              <button
                onClick={() => setOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-full text-white/55 transition hover:text-white"
                aria-label="Close requests"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-thin px-5 py-4">
              {count === 0 ? (
                <div className="py-6 text-center text-sm italic text-white/40">
                  No requests yet — ask Solenne for anything.
                </div>
              ) : (
                <>
                  {orders.map((o) => (
                    <OrderRow key={o.order_id} order={o} />
                  ))}
                  {messages.map((m) => (
                    <MessageRow key={m.message_id} message={m} />
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto relative grid h-14 w-14 place-items-center rounded-full glass-strong text-gold-200 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] transition hover:text-gold-100"
        aria-label={`Your requests (${count})`}
      >
        <Icon name="bag" className="h-6 w-6" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-gold-sheen px-1.5 text-[11px] font-semibold text-ink-900">
            {count}
          </span>
        )}
      </button>
    </div>
  );
}

function StatusChip({ label, tone }: { label: string; tone: "active" | "done" | "cancelled" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest",
        tone === "done" && "bg-teal-500/15 text-teal-200",
        tone === "active" && "bg-gold-500/15 text-gold-200",
        tone === "cancelled" && "bg-rose-500/15 text-rose-200"
      )}
    >
      {label}
    </span>
  );
}

function OrderRow({ order }: { order: OrderWire }) {
  const cancelled = order.status === "CANCELLED";
  const delivered = order.status === "DELIVERED";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-black/20 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-sand-100">
          {order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
        </span>
        <span className="shrink-0 text-gold text-sm">{formatMoney(order.total_usd * 100)}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <StatusChip
          label={ORDER_STATUS_LABEL[order.status]}
          tone={cancelled ? "cancelled" : delivered ? "done" : "active"}
        />
        {!cancelled && (
          <div className="flex flex-1 gap-1">
            {ORDER_FLOW.map((s, i) => {
              const reached = ORDER_FLOW.indexOf(order.status) >= i;
              return (
                <div
                  key={s}
                  className={cn("h-1 flex-1 rounded-full", reached ? "bg-gold-400" : "bg-white/10")}
                />
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MessageRow({ message }: { message: LobbyMessageWire }) {
  const resolved = message.status === "RESOLVED";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-black/20 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-gold-200/70">
          <Icon name="chat" className="h-3.5 w-3.5" /> Front desk
        </span>
        <StatusChip label={resolved ? "Resolved" : "In progress"} tone={resolved ? "done" : "active"} />
      </div>
      <div className="mt-2 text-sm text-sand-100">{message.body}</div>
      {message.replies?.map((r, i) => (
        <div
          key={i}
          className="mt-2 rounded-xl border border-gold-400/30 bg-gold-500/10 px-3 py-2 text-sm text-sand-100"
        >
          <div className="mb-0.5 text-[9px] uppercase tracking-widest text-gold-200">Front desk</div>
          {r.body}
        </div>
      ))}
    </motion.div>
  );
}
