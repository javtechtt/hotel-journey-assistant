"use client";

import { motion } from "framer-motion";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { AvailabilityWire } from "@/lib/wire-types";

export function AvailabilityStage({
  data,
  focusedSlug
}: {
  data: AvailabilityWire;
  focusedSlug?: string | null;
}) {
  return (
    <motion.section
      key="availability"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.6 }}
      className="relative mx-auto flex h-full max-w-4xl flex-col justify-center text-center"
    >
      <div className="text-[11px] uppercase tracking-luxe text-gold-200/80">Your stay</div>

      <div className="mt-6 flex items-center justify-center gap-4 sm:gap-8">
        <DateBlock label="Check in" value={data.check_in_date} />
        <Icon name="arrowRight" className="h-7 w-7 text-gold-400/70" />
        <DateBlock label="Check out" value={data.check_out_date} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Chip icon="moon" label={`${data.nights} ${data.nights === 1 ? "night" : "nights"}`} />
        <Chip icon="users" label={`${data.party_size} ${data.party_size === 1 ? "guest" : "guests"}`} />
      </div>

      <div className="mt-10 space-y-2.5 text-left">
        {data.availability.map((a) => {
          const focused = focusedSlug === a.slug;
          const sold = a.rooms_available === 0;
          return (
            <div
              key={a.slug}
              className={cn(
                "flex items-center gap-4 rounded-2xl border px-5 py-4 transition",
                focused
                  ? "border-gold-400/60 bg-gold-500/10"
                  : "border-white/8 bg-white/[0.025]"
              )}
            >
              <div className="flex-1">
                <div className="font-display text-xl text-sand-100">{a.name}</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={cn("h-full rounded-full", sold ? "bg-rose-400/70" : "bg-teal-400/80")}
                      style={{ width: `${Math.min(100, (a.rooms_available / a.total_rooms) * 100)}%` }}
                    />
                  </div>
                  <span className={cn("text-[11px] uppercase tracking-widest", sold ? "text-rose-300" : "text-teal-200/80")}>
                    {sold ? "Sold out" : `${a.rooms_available} left`}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-gold text-xl font-semibold">{formatMoney(a.estimated_total_usd * 100)}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">est. total</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-500/10 px-4 py-2 text-xs text-gold-200">
        <Icon name="key" className="h-4 w-4" /> “Reserve this room”
      </div>
    </motion.section>
  );
}

function DateBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">{label}</div>
      <div className="font-display text-4xl sm:text-5xl text-sand-100 mt-1">{formatDate(value)}</div>
    </div>
  );
}
function Chip({ icon, label }: { icon: IconName; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-sand-100/85">
      <Icon name={icon} className="h-4 w-4" /> {label}
    </span>
  );
}
