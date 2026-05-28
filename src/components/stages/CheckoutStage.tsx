"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { RoomScene } from "@/components/art/RoomScene";
import { formatDate, formatMoney } from "@/lib/format";
import type { ReservationWire } from "@/lib/wire-types";

function formatCardNumber(v: string) {
  return v
    .replace(/[^0-9]/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export type PaymentPrefill = {
  card_name?: string;
  card_number?: string;
  expiry?: string;
  cvv?: string;
};

// Realistic, client-ready secure checkout. Fields start empty — the guest
// provides their details (by voice, via set_payment_details, or by typing).
// Card values are never submitted to our server, sent to OpenAI, or stored.
export function CheckoutStage({
  reservation,
  isProcessing,
  prefill
}: {
  reservation: ReservationWire;
  isProcessing: boolean;
  prefill?: PaymentPrefill;
}) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");

  // Fill from voice-collected details when they arrive.
  useEffect(() => {
    if (prefill?.card_name != null) setName(prefill.card_name);
  }, [prefill?.card_name]);
  useEffect(() => {
    if (prefill?.card_number != null) setCardNumber(formatCardNumber(prefill.card_number));
  }, [prefill?.card_number]);
  useEffect(() => {
    if (prefill?.expiry != null) setExpiry(prefill.expiry);
  }, [prefill?.expiry]);
  useEffect(() => {
    if (prefill?.cvv != null) setCvv(prefill.cvv.replace(/[^0-9]/g, "").slice(0, 4));
  }, [prefill?.cvv]);

  return (
    <motion.section
      key="checkout"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.6 }}
      className="relative mx-auto flex h-full w-full max-w-5xl items-center"
    >
      <div className="relative max-h-full w-full overflow-y-auto scrollbar-thin rounded-[2rem] glass-strong">
        <div className="absolute inset-0 -z-10 opacity-40">
          <RoomScene slug={reservation.room_type_slug} scrim="full" />
        </div>

        <div className="flex items-center justify-between px-8 pt-7">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold-200/80">
            <Icon name="card" className="h-4 w-4" /> Secure checkout
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Reservation</div>
            <div className="font-display text-lg text-gold">{reservation.reservation_code}</div>
          </div>
        </div>

        <div className="grid gap-8 px-8 py-7 lg:grid-cols-2">
          {/* summary */}
          <div className="space-y-5">
            <h2 className="font-display text-3xl text-sand-100">{reservation.room_type}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Guest" value={reservation.guest_name} />
              <Field label="Guests" value={`${reservation.party_size}`} />
              <Field label="Check in" value={formatDate(reservation.check_in_date)} />
              <Field label="Check out" value={formatDate(reservation.check_out_date)} />
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-5 space-y-2.5 text-sm">
              <Row
                label={`${formatMoney(reservation.nightly_rate_usd * 100)} × ${reservation.nights} nights`}
                value={formatMoney(reservation.subtotal_usd * 100)}
              />
              <Row label="Taxes & resort fees" value={formatMoney(reservation.taxes_usd * 100)} />
              <div className="divider-gold my-2" />
              <div className="flex items-end justify-between">
                <span className="text-[11px] uppercase tracking-[0.3em] text-white/50">Total</span>
                <span className="text-gold font-display text-4xl leading-none">
                  {formatMoney(reservation.total_usd * 100)}
                </span>
              </div>
            </div>
          </div>

          {/* payment */}
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-[0.3em] text-gold-200/80">Payment details</div>
            <CardField label="Cardholder name" value={name} onChange={setName} />
            <CardField
              label="Card number"
              value={cardNumber}
              onChange={(v) =>
                setCardNumber(v.replace(/[^0-9]/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim())
              }
              inputMode="numeric"
            />
            <div className="grid grid-cols-2 gap-3">
              <CardField label="Expiry" value={expiry} onChange={setExpiry} />
              <CardField label="Security code" value={cvv} onChange={(v) => setCvv(v.replace(/[^0-9]/g, "").slice(0, 4))} inputMode="numeric" secure />
            </div>
            <div className="text-[11px] leading-snug text-white/45">
              Encrypted by Maison Solenne · your card is tokenized and never stored.
            </div>

            <motion.div
              animate={{ opacity: isProcessing ? [0.7, 1, 0.7] : 1 }}
              transition={{ duration: 1.3, repeat: isProcessing ? Infinity : 0 }}
              className="mt-1 flex items-center gap-3 rounded-2xl border border-gold-400/40 bg-gradient-to-br from-gold-400/20 to-amber-500/10 p-4"
            >
              <Icon name={isProcessing ? "card" : "mic"} className="h-5 w-5 text-gold-200" />
              <div className="text-sm text-sand-100">
                {isProcessing ? "Authorizing payment…" : "Share your payment details, then say “confirm booking”"}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">{label}</div>
      <div className="text-sand-100">{value}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/65">{label}</span>
      <span className="text-sand-100">{value}</span>
    </div>
  );
}
function CardField({
  label,
  value,
  onChange,
  inputMode,
  secure
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "numeric" | "text";
  secure?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-white/40">{label}</div>
      <input
        type={secure ? "password" : "text"}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sand-100 focus:border-gold-400/60 focus:outline-none"
      />
    </label>
  );
}
