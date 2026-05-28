"use client";

import { motion } from "framer-motion";
import { RoomScene } from "@/components/art/RoomScene";

export function WelcomeStage() {
  return (
    <motion.section
      key="welcome"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className="relative flex h-full items-center justify-center overflow-hidden rounded-[2.5rem]"
    >
      <RoomScene
        image="/rooms/luxury-hotel-with-pools.webp"
        slug="ocean-view-suite"
        scrim="full"
        className="opacity-90"
      />
      <div className="relative z-10 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-[11px] uppercase tracking-luxe text-gold-200/80"
        >
          Saint-Tropez
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 1 }}
          className="font-display text-[18vw] leading-[0.85] text-sand-100 sm:text-[12vw] lg:text-[9rem]"
        >
          Maison<span className="block text-gold">Solenne</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.9 }}
          className="mx-auto mt-8 max-w-md font-display text-2xl text-sand-100/80"
        >
          Tell me what kind of stay you’re looking for.
        </motion.p>
      </div>
    </motion.section>
  );
}
