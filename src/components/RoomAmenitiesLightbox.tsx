"use client";

import { motion } from "framer-motion";
import { RoomScene } from "@/components/art/RoomScene";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/format";
import { roomVisual } from "@/lib/room-visuals";
import type { RoomTypeWire } from "@/lib/wire-types";

// Opt-in features & amenities panel shown over the room stage when the guest
// asks for more detail. Booking flow can bypass it entirely.
export function RoomAmenitiesLightbox({
  rt,
  onClose
}: {
  rt: RoomTypeWire;
  onClose: () => void;
}) {
  const v = roomVisual(rt.slug);
  const features: { icon: IconName; label: string; value: string }[] = [
    { icon: "users", label: "Capacity", value: `Sleeps ${rt.capacity}` },
    { icon: "bed", label: "Bed", value: rt.bedConfig },
    { icon: "maximize", label: "Size", value: rt.sizeSqft ? `${rt.sizeSqft} sq ft` : "—" },
    { icon: "eye", label: "View", value: rt.view }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[2rem] glass-strong"
      >
        {/* header band */}
        <div className="relative h-44 overflow-hidden">
          <RoomScene slug={rt.slug} scrim="full" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/35 text-white/70 transition hover:text-white"
            aria-label="Close details"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-6">
            <div className={`text-[10px] uppercase tracking-luxe ${v.accent}`}>{rt.mood}</div>
            <h2 className="font-display text-4xl leading-none text-sand-100">{rt.name}</h2>
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto scrollbar-thin p-6 lg:p-8">
          {rt.shortPitch && (
            <p className="text-sand-100/80 leading-relaxed">{rt.shortPitch}</p>
          )}

          {/* features */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {features.map((f) => (
              <div key={f.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2 text-gold-200/80">
                  <Icon name={f.icon} className="h-4 w-4" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">{f.label}</span>
                </div>
                <div className="text-sm text-sand-100">{f.value}</div>
              </div>
            ))}
          </div>

          {/* amenities */}
          <div className="mt-7">
            <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-gold-200/70">
              Features & amenities
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {rt.amenities.map((a) => (
                <div key={a} className="flex items-center gap-3 text-sm text-sand-100/90">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold-500/12 text-gold-200">
                    <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  {a}
                </div>
              ))}
            </div>
          </div>

          {/* footer */}
          <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-500/10 px-4 py-2 text-xs text-gold-200">
              <Icon name="key" className="h-4 w-4" /> “Reserve this room” or “check availability”
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">from</div>
              <div className="text-gold font-display text-3xl leading-none">
                {formatMoney(rt.nightlyRateCents)}
              </div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">per night</div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
