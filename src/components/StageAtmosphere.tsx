"use client";

import { motion } from "framer-motion";

// Fixed cinematic background. Aurora hues animate smoothly when the focused
// room / stage changes, giving the whole app a single living atmosphere.
export function StageAtmosphere({ aurora }: { aurora: [string, string] }) {
  return (
    <>
      <div className="fixed inset-0 -z-20 bg-[#04060c]" />
      <motion.div
        className="aurora -z-10"
        // CSS custom props drive the ::before / ::after blobs
        animate={{}}
        style={{
          // @ts-expect-error custom properties
          "--aurora-a": aurora[0],
          "--aurora-b": aurora[1]
        }}
      />
    </>
  );
}
