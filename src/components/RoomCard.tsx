"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { roomVisual } from "@/lib/room-visuals";
import { RoomScene } from "@/components/art/RoomScene";
import { Icon } from "@/components/ui/Icon";
import type { RoomTypeWire } from "@/lib/wire-types";

// Gallery tile — fills its column. `highlight` pulses while the assistant is
// speaking about this room; `active` is a static selected state.
export function RoomCard({
  rt,
  active,
  highlight,
  onSelect,
  availabilityLabel,
  aspectClass = "aspect-[4/5]",
  fill
}: {
  rt: RoomTypeWire;
  active?: boolean;
  highlight?: boolean;
  onSelect?: () => void;
  availabilityLabel?: string;
  aspectClass?: string;
  fill?: boolean;
}) {
  const v = roomVisual(rt.slug);
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      animate={{ scale: highlight ? 1.03 : 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className={cn(
        "group relative w-full overflow-hidden rounded-3xl text-left",
        fill ? "h-full" : aspectClass,
        highlight
          ? "z-10 ring-2 ring-gold-400 shadow-gold"
          : active
          ? "ring-2 ring-gold-400/70 shadow-gold"
          : "ring-1 ring-white/8"
      )}
    >
      <RoomScene slug={rt.slug} scrim="full" />

      {/* pulsing highlight while the assistant names this room */}
      {highlight && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl ring-2 ring-gold-200"
          animate={{ opacity: [0.2, 0.95, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {availabilityLabel && (
        <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] text-white/80 backdrop-blur">
          {availabilityLabel}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-5">
        <div className={cn("mb-1.5 text-[10px] uppercase tracking-[0.3em]", v.accent)}>
          {rt.mood.split("·")[0]?.trim()}
        </div>
        <h3 className="font-display text-[1.7rem] leading-none text-sand-100 drop-shadow">{rt.name}</h3>
        <div className="mt-3 flex items-end justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
            <Icon name="users" className="h-4 w-4" /> {rt.capacity}
          </span>
          <div className="text-right">
            <div className="text-gold text-2xl font-semibold leading-none">
              {formatMoney(rt.nightlyRateCents)}
            </div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-white/45">night</div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
