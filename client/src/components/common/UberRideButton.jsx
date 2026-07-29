import React from "react";
import { motion } from "framer-motion";
import { openUberRide } from "../../utils/uberDeepLink";

export default function UberRideButton({ latitude, longitude, nickname, compact = false, className = "" }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => openUberRide({ latitude, longitude, nickname })}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 font-black text-white shadow-lg transition hover:bg-[#111827] ${compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"} ${className}`}
    >
      <span aria-hidden="true">🚕</span>
      Book Ride
    </motion.button>
  );
}