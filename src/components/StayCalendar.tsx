"use client";

import { motion } from "framer-motion";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

function parseISO(s?: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function MonthGrid({
  year,
  month,
  checkIn,
  checkOut,
  today
}: {
  year: number;
  month: number;
  checkIn: Date | null;
  checkOut: Date | null;
  today: Date;
}) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  const label = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="w-60">
      <div className="mb-2 text-center text-sm text-sand-100">{label}</div>
      <div className="grid grid-cols-7 text-center text-[10px] uppercase tracking-widest text-white/30">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const isIn = !!checkIn && sameDay(c, checkIn);
          const isOut = !!checkOut && sameDay(c, checkOut);
          const inRange = !!checkIn && !!checkOut && c > checkIn && c < checkOut;
          const isToday = sameDay(c, today);
          const isPast = c < today && !isIn && !isOut;
          return (
            <div
              key={i}
              className={cn(
                "grid h-8 place-items-center text-sm",
                inRange && "bg-gold-500/15",
                isIn && "rounded-l-lg bg-gold-sheen font-semibold text-ink-900",
                isOut && "rounded-r-lg bg-gold-sheen font-semibold text-ink-900",
                !isIn && !isOut && !inRange && (isPast ? "text-white/25" : "text-sand-100/85"),
                isToday && !isIn && !isOut && "rounded-lg ring-1 ring-white/25"
              )}
            >
              {c.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ icon, label, on }: { icon: IconName; label: string; on?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm",
        on
          ? "border-gold-400/40 bg-gold-500/12 text-sand-100"
          : "border-white/10 bg-white/[0.03] text-white/45"
      )}
    >
      <Icon name={icon} className="h-4 w-4" /> {label}
    </span>
  );
}

// Live date picker that fills in as the assistant collects check-in, check-out,
// and guest count by voice — shown over the room before the availability stage.
export function StayCalendar({
  checkIn,
  checkOut,
  partySize,
  onClose
}: {
  checkIn?: string;
  checkOut?: string;
  partySize?: number;
  onClose: () => void;
}) {
  const ci = parseISO(checkIn);
  const co = parseISO(checkOut);
  const today = startOfDay(new Date());
  const base = ci ?? today;
  const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  const nights = ci && co ? Math.max(0, Math.round((co.getTime() - ci.getTime()) / 86400000)) : 0;
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const hint = !ci
    ? "Tell me your check-in date"
    : !co
    ? "And your check-out date?"
    : !partySize
    ? "How many guests?"
    : "Say “check availability”";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-xl rounded-[2rem] glass-strong p-7"
      >
        <div className="mb-5 text-center">
          <div className="text-[10px] uppercase tracking-luxe text-gold-200/80">Your stay</div>
          <h3 className="mt-1 font-display text-2xl text-sand-100">Choosing your dates</h3>
        </div>

        <div className="flex justify-center gap-6">
          <MonthGrid year={base.getFullYear()} month={base.getMonth()} checkIn={ci} checkOut={co} today={today} />
          <div className="hidden sm:block">
            <MonthGrid year={next.getFullYear()} month={next.getMonth()} checkIn={ci} checkOut={co} today={today} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <Chip icon="calendar" label={ci ? fmt(ci) : "Check-in"} on={!!ci} />
          <Icon name="arrowRight" className="h-4 w-4 text-gold-400/60" />
          <Chip icon="calendar" label={co ? fmt(co) : "Check-out"} on={!!co} />
          {nights > 0 && <Chip icon="moon" label={`${nights} ${nights === 1 ? "night" : "nights"}`} on />}
          {partySize ? (
            <Chip icon="users" label={`${partySize} ${partySize === 1 ? "guest" : "guests"}`} on />
          ) : null}
        </div>

        <div className="mt-5 text-center text-xs text-gold-200/80">{hint}</div>
      </motion.div>
    </motion.div>
  );
}
