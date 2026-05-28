"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { CopyCode } from "@/components/CopyCode";
import { MenuCarousel } from "@/components/MenuCarousel";
import type { MenuItemWire, ReservationWire } from "@/lib/wire-types";

// Post-booking concierge: the room-service menu to browse and order from. The
// guest's actual orders and front-desk requests live in the floating requests
// cart (RequestsCart) rather than a chat-style rail here.
export function ConciergeStage({
  reservation,
  menu
}: {
  reservation: ReservationWire;
  menu: MenuItemWire[];
}) {
  return (
    <motion.section
      key="concierge"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.6 }}
      className="relative flex h-full flex-col"
    >
      <div className="mb-4 flex shrink-0 items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-luxe text-gold-200/80">Concierge</div>
          <h2 className="font-display text-3xl text-sand-100 mt-1">At your service</h2>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs text-white/60">
          <span>Room {reservation.room_number}</span>
          <CopyCode code={reservation.reservation_code} className="px-3 py-1.5 text-xs" />
        </div>
      </div>

      <div className="mb-4 flex shrink-0 flex-wrap gap-2.5">
        <Hint label="Send two coffees to my room" />
        <Hint label="I need extra towels" />
        <Hint label="Tell the front desk I’d like late checkout" />
      </div>

      {/* room service menu — 3D rotating carousel, full width */}
      <div className="min-h-0 flex-1">
        <MenuCarousel menu={menu} />
      </div>
    </motion.section>
  );
}

function Hint({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-500/8 px-4 py-2 text-xs text-gold-200/90">
      <Icon name="mic" className="h-3.5 w-3.5" /> “{label}”
    </span>
  );
}
