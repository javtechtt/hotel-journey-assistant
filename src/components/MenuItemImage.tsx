"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { MenuArt } from "@/components/art/MenuArt";

// Base visual is a hand-built SVG illustration per item. If a real photo exists
// at /public/menu/<slug>.{webp,jpg,...} and NEXT_PUBLIC_USE_ROOM_IMAGES=1, it
// layers over the illustration; a missing photo falls back to the art.
const USE_IMAGES = process.env.NEXT_PUBLIC_USE_ROOM_IMAGES === "1";
const EXTS = ["webp", "jpg", "jpeg", "png"];

export function MenuItemImage({
  slug,
  category,
  className
}: {
  slug: string;
  category?: string;
  className?: string;
}) {
  const [extIdx, setExtIdx] = useState(0);
  const showPhoto = USE_IMAGES && extIdx < EXTS.length;
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <MenuArt slug={slug} category={category} />
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
