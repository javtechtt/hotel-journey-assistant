"use client";

import { motion } from "framer-motion";
import { RoomScene } from "@/components/art/RoomScene";
import { Icon, type IconName } from "@/components/ui/Icon";
import { CopyCode } from "@/components/CopyCode";
import { formatDate, formatMoney } from "@/lib/format";
import type { ReservationWire } from "@/lib/wire-types";

export function ConfirmationStage({
  reservation,
  onContinue
}: {
  reservation: ReservationWire;
  onContinue: () => void;
}) {
  const actions: { label: string; icon: IconName }[] = [
    { label: "Order room service", icon: "bell" },
    { label: "Message the lobby", icon: "chat" },
    { label: "View stay details", icon: "eye" }
  ];
  return (
    <motion.section
      key="confirmed"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative h-full overflow-hidden rounded-[2.5rem]"
    >
      <RoomScene slug={reservation.room_type_slug} scrim="full" className="opacity-80" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 14 }}
          className="grid h-16 w-16 place-items-center rounded-full bg-gold-sheen text-ink-900"
        >
          <Icon name="check" className="h-8 w-8" strokeWidth={2.4} />
        </motion.div>

        <div className="mt-6 text-[11px] uppercase tracking-luxe text-gold-200/80">Reservation confirmed</div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-3"
        >
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Your room</div>
          <div className="font-display text-8xl leading-none text-sand-100">{reservation.room_number}</div>
        </motion.div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-sm">
          <CopyCode code={reservation.reservation_code} />
          <Pill icon="bed" label={reservation.room_type} />
          <Pill
            icon="calendar"
            label={`${formatDate(reservation.check_in_date)} → ${formatDate(reservation.check_out_date)}`}
          />
        </div>

        <div className="mt-6">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/45">Total paid</span>
          <div className="text-gold font-display text-4xl">{formatMoney(reservation.total_usd * 100)}</div>
          {reservation.card_last4 && (
            <div className="mt-1 text-[11px] text-white/50">
              {reservation.card_brand} ending in •••• {reservation.card_last4}
            </div>
          )}
        </div>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-2.5">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={onContinue}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-xs text-sand-100/85 transition hover:border-gold-400/40 hover:text-gold-200"
            >
              <Icon name={a.icon} className="h-4 w-4" /> {a.label}
            </button>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function Pill({ icon, label }: { icon: IconName; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/25 px-4 py-2 text-sand-100/85">
      <Icon name={icon} className="h-4 w-4" /> {label}
    </span>
  );
}
