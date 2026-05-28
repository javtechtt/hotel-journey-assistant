"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Icon, type IconName } from "@/components/ui/Icon";
import { CopyCode } from "@/components/CopyCode";
import { MenuCarousel } from "@/components/MenuCarousel";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import type { LobbyMessageWire, MenuItemWire, OrderWire, ReservationWire } from "@/lib/wire-types";

const ORDER_FLOW: Array<OrderWire["status"]> = ["RECEIVED", "PREPARING", "EN_ROUTE", "DELIVERED"];

export function ConciergeStage({
  reservation,
  menu,
  orders,
  messages
}: {
  reservation: ReservationWire;
  menu: MenuItemWire[];
  orders: OrderWire[];
  messages: LobbyMessageWire[];
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

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1.5fr,1fr]">
        {/* room service menu — 3D rotating carousel */}
        <div className="min-h-0">
          <MenuCarousel menu={menu} />
        </div>

        {/* right rail: orders + lobby */}
        <div className="min-h-0 space-y-5 overflow-y-auto scrollbar-thin pr-1">
          <Panel title="Room service" icon="bell">
            {orders.length === 0 ? (
              <Empty text="No orders yet. Ask Solenne to send something up." />
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {orders.map((o) => (
                    <motion.div
                      key={o.order_id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-xl border border-white/8 bg-black/20 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-sand-100">
                          {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                        </span>
                        <span className="text-gold text-sm">{formatMoney(o.total_usd * 100)}</span>
                      </div>
                      <div className="mt-3 flex gap-1">
                        {ORDER_FLOW.map((s, i) => {
                          const reached = ORDER_FLOW.indexOf(o.status) >= i;
                          return (
                            <div key={s} className="flex-1">
                              <div className={cn("h-1 rounded-full", reached ? "bg-gold-400" : "bg-white/10")} />
                              <div className={cn("mt-1 text-[8px] uppercase tracking-widest", reached ? "text-gold-200/80" : "text-white/25")}>
                                {s.replace("_", " ").toLowerCase()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Panel>

          <Panel title="Front desk" icon="chat">
            {messages.length === 0 ? (
              <Empty text="No messages yet. Tell Solenne what you need from the lobby." />
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {messages.map((m) => (
                    <motion.div key={m.message_id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                      <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-sm bg-white/[0.06] px-4 py-2.5 text-sm text-sand-100">
                        {m.body}
                      </div>
                      {m.replies?.map((r, i) => (
                        <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-gold-400/30 bg-gold-500/10 px-4 py-2.5 text-sm text-sand-100">
                          <div className="text-[9px] uppercase tracking-widest text-gold-200 mb-0.5">Front desk</div>
                          {r.body}
                        </div>
                      ))}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Panel>
        </div>
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
function Panel({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-200/70">
        <Icon name={icon} className="h-4 w-4" /> {title}
      </div>
      {children}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="text-sm text-white/40 italic">{text}</div>;
}
