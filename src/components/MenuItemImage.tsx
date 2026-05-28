"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

// When NEXT_PUBLIC_USE_ROOM_IMAGES=1, a photo at /public/menu/<slug>.{webp,jpg,...}
// is layered over a gradient + line icon. If the photo is missing it falls back
// silently to the icon — so the menu always looks complete.
const USE_IMAGES = process.env.NEXT_PUBLIC_USE_ROOM_IMAGES === "1";
const EXTS = ["webp", "jpg", "jpeg", "png"];

export function MenuItemImage({
  slug,
  icon,
  className
}: {
  slug: string;
  icon: IconName;
  className?: string;
}) {
  const [extIdx, setExtIdx] = useState(0);
  const showPhoto = USE_IMAGES && extIdx < EXTS.length;
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-gold-500/15 to-teal-500/10" />
      <div className="absolute inset-0 grid place-items-center text-gold-200/80">
        <Icon name={icon} className="h-8 w-8" />
      </div>
      {showPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={EXTS[extIdx]}
          src={`/menu/${slug}.${EXTS[extIdx]}`}
          alt=""
          aria-hidden
          loading="lazy"
          onError={() => setExtIdx((i) => i + 1)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
    </div>
  );
}
