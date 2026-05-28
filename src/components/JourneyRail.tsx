"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { JourneyEventWire } from "@/lib/wire-types";

export type { JourneyEventWire };

const KIND_ICON: Record<string, IconName> = {
  VIEWED_ROOMS: "compass",
  ROOM_VIEWED: "eye",
  CHECKED_AVAILABILITY: "calendar",
  RESERVATION_HOLD: "key",
  CHECKOUT_COMPLETED: "card",
  RESERVATION_CONFIRMED: "check",
  ORDER_PLACED: "bell",
  ORDER_STATUS_CHANGED: "bell",
  LOBBY_MESSAGE_SENT: "chat",
  LOBBY_REPLY_SENT: "chat"
};

export function JourneyRail({ events }: { events: JourneyEventWire[] }) {
  if (events.length === 0) {
    return <div className="text-sm text-white/40 italic">No journey events recorded yet.</div>;
  }
  return (
    <ol className="relative space-y-4 pl-2">
      <span className="absolute left-[18px] top-2 bottom-2 w-px bg-white/10" />
      <AnimatePresence initial={false}>
        {events.map((e, idx) => (
          <motion.li
            key={(e.id ?? e.kind) + e.at + idx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative flex items-start gap-3"
          >
            <span className="relative z-10 grid h-9 w-9 place-items-center rounded-full border border-gold-400/25 bg-ink-800 text-gold-200">
              <Icon name={KIND_ICON[e.kind] ?? "sparkle"} className="h-4 w-4" />
            </span>
            <div className="pt-1">
              <div className="text-sm text-sand-100">{e.label}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">
                {new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}
