import React from "react";
import { motion } from "framer-motion";

export default function GuestPageHeader({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="guest-page-header flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
    >
      <div className="min-w-0">
        <p className="guest-page-eyebrow text-[10px] font-black uppercase tracking-[0.22em] text-[#FF385C]">
          {eyebrow}
        </p>
        <h1 className="guest-page-title mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="guest-page-description mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>
      {action && <div className="guest-page-action shrink-0">{action}</div>}
    </motion.header>
  );
}
