"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RoomCard } from "@/components/RoomCard";
import { RoomScene } from "@/components/art/RoomScene";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { roomVisual } from "@/lib/room-visuals";
import type { RoomTypeWire } from "@/lib/wire-types";

// Bento spans (4-room layout): one tall hero + one wide + two compact tiles.
// Varied sizes "fit together" like masonry while filling exactly two rows so
// the whole gallery fits one screen with no scrolling.
const BENTO = [
  "sm:col-span-2 sm:row-span-2",
  "sm:col-span-2 sm:row-span-1",
  "sm:col-span-1 sm:row-span-1",
  "sm:col-span-1 sm:row-span-1"
];

export function DiscoveryStage({
  rooms,
  focusedSlug,
  highlightSlug,
  focusMode,
  availabilityLabel,
  onSelect,
  onClose
}: {
  rooms: RoomTypeWire[];
  focusedSlug: string | null;
  highlightSlug: string | null;
  focusMode: boolean;
  availabilityLabel?: string;
  onSelect: (slug: string) => void;
  onClose: () => void;
}) {
  const focused = rooms.find((r) => r.slug === focusedSlug) ?? null;
  const showFocus = focusMode && !!focused;

  return (
    <motion.section
      key="discovery"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="relative flex h-full flex-col"
    >
      <div className="mb-4 shrink-0 text-center">
        <div className="text-[10px] uppercase tracking-luxe text-gold-200/80">The collection</div>
        <h2 className="mt-1 font-display text-3xl text-sand-100">Choose your stay</h2>
      </div>

      {/* bento gallery — every room type, fits one screen */}
      {rooms.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="glass max-w-md rounded-[2rem] px-10 py-12 text-center">
            <div className="text-[10px] uppercase tracking-luxe text-gold-200/70">The collection</div>
            <h3 className="mt-3 font-display text-3xl text-sand-100">Our suites are being prepared</h3>
            <p className="mt-3 text-sm text-sand-100/70">Please check back in a moment.</p>
            <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-white/25">
              Room catalog unavailable — seed the database
            </p>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3 transition-all duration-500 sm:grid-cols-4 sm:gap-4",
            showFocus && "scale-[0.97] blur-[14px] brightness-[0.4] pointer-events-none"
          )}
        >
          {rooms.map((rt, i) => (
            <div key={rt.slug} className={cn("min-h-0", rooms.length === 4 ? BENTO[i] : "")}>
              <RoomCard
                rt={rt}
                fill
                active={!showFocus && focusedSlug === rt.slug}
                highlight={!showFocus && highlightSlug === rt.slug}
                onSelect={() => onSelect(rt.slug)}
              />
            </div>
          ))}
        </div>
      )}

      {/* bokeh focus overlay — the room the assistant is speaking about */}
      <AnimatePresence>
        {showFocus && focused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={onClose}
            className="absolute inset-0 z-20 flex items-center justify-center px-4"
          >
            <FocusedRoom rt={focused} availabilityLabel={availabilityLabel} onClose={onClose} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

const HINTS: { label: string; icon: IconName }[] = [
  { label: "Tell me more", icon: "sparkle" },
  { label: "Check availability", icon: "calendar" },
  { label: "Reserve this room", icon: "key" }
];

function FocusedRoom({
  rt,
  availabilityLabel,
  onClose
}: {
  rt: RoomTypeWire;
  availabilityLabel?: string;
  onClose: () => void;
}) {
  const v = roomVisual(rt.slug);
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 22 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.92, opacity: 0 }}
      transition={{ type: "spring", stiffness: 210, damping: 24 }}
      onClick={(e) => e.stopPropagation()}
      className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] ring-1 ring-gold-400/40 shadow-[0_60px_140px_-40px_rgba(0,0,0,0.85)]"
    >
      <div className="relative h-[58vh] max-h-[560px]">
        <RoomScene slug={rt.slug} scrim="full" />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/35 text-white/70 transition hover:text-white"
          aria-label="Back to all rooms"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>

        <div className="absolute inset-x-0 bottom-0 p-7">
          <div className={cn("text-[11px] uppercase tracking-luxe", v.accent)}>{rt.mood}</div>
          <h2 className="mt-2 font-display text-5xl leading-[0.9] text-sand-100">{rt.name}</h2>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <Chip icon="users" label={`Sleeps ${rt.capacity}`} />
            <Chip icon="bed" label={rt.bedConfig} />
            <Chip icon="eye" label={rt.view} />
            {availabilityLabel && <Chip icon="check" label={availabilityLabel} accent />}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {rt.amenities.slice(0, 3).map((a) => (
              <span
                key={a}
                className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-xs text-sand-100/80"
              >
                {a}
              </span>
            ))}
          </div>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {HINTS.map((h) => (
                <span
                  key={h.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/30 bg-gold-500/10 px-3 py-1.5 text-[11px] text-gold-200"
                >
                  <Icon name={h.icon} className="h-3.5 w-3.5" /> “{h.label}”
                </span>
              ))}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-gold font-display text-4xl leading-none">
                {formatMoney(rt.nightlyRateCents)}
              </div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">per night</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Chip({ icon, label, accent }: { icon: IconName; label: string; accent?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm",
        accent
          ? "border border-teal-400/40 bg-teal-500/15 text-teal-200"
          : "border border-white/10 bg-black/25 text-sand-100/85"
      )}
    >
      <Icon name={icon} className="h-4 w-4" />
      {label}
    </span>
  );
}
