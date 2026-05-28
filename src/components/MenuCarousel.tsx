"use client";

import { MenuItemImage } from "@/components/MenuItemImage";
import { formatMoney } from "@/lib/format";
import type { MenuItemWire } from "@/lib/wire-types";

const CARD_W = 132;

// A 3D cylinder carousel of menu items that auto-rotates. Hovering pauses it.
export function MenuCarousel({ menu }: { menu: MenuItemWire[] }) {
  if (menu.length === 0) {
    return (
      <div className="grid h-full min-h-[340px] place-items-center">
        <div className="glass max-w-sm rounded-[2rem] px-8 py-10 text-center">
          <div className="text-[10px] uppercase tracking-luxe text-gold-200/70">Concierge</div>
          <h3 className="mt-3 font-display text-2xl text-sand-100">The menu is being prepared</h3>
          <p className="mt-3 text-sm text-sand-100/70">Please check back in a moment.</p>
          <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-white/25">
            Menu unavailable — seed the database
          </p>
        </div>
      </div>
    );
  }
  const n = Math.max(menu.length, 1);
  const angle = 360 / n;
  // Radius that keeps cards from overlapping on the ring.
  const radius = Math.max(220, Math.round(CARD_W / 2 / Math.tan(Math.PI / n)) + 28);

  return (
    <div className="carousel relative grid h-full min-h-[340px] place-items-center overflow-hidden [perspective:1200px] [perspective-origin:50%_45%]">
      <div
        className="carousel-ring relative"
        style={{ width: CARD_W, height: 196, transformStyle: "preserve-3d" }}
      >
        {menu.map((m, i) => (
          <div
            key={m.slug}
            className="carousel-card absolute inset-0"
            style={{ transform: `rotateY(${i * angle}deg) translateZ(${radius}px)` }}
          >
            <div className="h-full overflow-hidden rounded-2xl border border-white/12 bg-white/[0.05] shadow-glass">
              <MenuItemImage slug={m.slug} category={m.category} className="h-28 w-full" />
              <div className="p-3 text-center">
                <div className="font-display text-sm leading-tight text-sand-100 line-clamp-2">
                  {m.name}
                </div>
                <div className="mt-1 text-xs">
                  {m.price_usd > 0 ? (
                    <span className="text-gold">{formatMoney(m.price_usd * 100)}</span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-widest text-teal-200/80">
                      Complimentary
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
