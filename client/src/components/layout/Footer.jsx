import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const footerGroups = [
  {
    title: "Explore",
    links: [
      ["All properties", "/guest/search"],
      ["Premium stays", "/guest/premium"],
      ["Wishlist", "/guest/wishlist"],
      ["My bookings", "/guest/trips?tab=upcoming"],
    ],
  },
  {
    title: "For hosts",
    links: [
      ["Host dashboard", "/host/dashboard"],
      ["Add a property", "/host/add-listing"],
      ["Host bookings", "/host/bookings"],
      ["Revenue", "/host/revenue"],
    ],
  },
  {
    title: "Support",
    links: [
      ["Help centre", "/guest/hub/support"],
      ["Notifications", "/notifications"],
      ["Profile & security", "/profile"],
      ["Premium membership", "/guest/premium"],
    ],
  },
];

export default function Footer({ compact = false, premium = false, theme = "dark" }) {
  return (
    <footer
      className={`relative overflow-hidden border-t ${
        premium
          ? theme === "light"
            ? "border-amber-300/50 bg-gradient-to-br from-[#fffdf5] via-[#fff4cf] to-[#f8e7d5] text-slate-900"
            : "border-amber-400/15 bg-[#0a0d18] text-white"
          : "border-rose-200/60 bg-gradient-to-br from-[#2a0d18] via-[#121827] to-[#111827] text-white"
      }`}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-rose-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

      <div className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${compact ? "py-8" : "py-12 sm:py-14"}`}>
        <div className={`grid gap-9 ${compact ? "lg:grid-cols-[1.1fr_2fr]" : "lg:grid-cols-[1.25fr_2fr]"}`}>
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <motion.span
                whileHover={{ rotate: -8, scale: 1.06 }}
                className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#ff385c] to-[#b50d3b] text-xl font-black text-white shadow-lg shadow-rose-950/40"
              >
                h
              </motion.span>
              <span>
                <span className="block text-2xl font-black tracking-tight">hydewest</span>
                <span className={`block text-[10px] font-black uppercase tracking-[0.22em] ${premium && theme === "light" ? "text-amber-700" : "text-rose-200/65"}`}>
                  stays that feel personal
                </span>
              </span>
            </Link>

            <p className={`mt-5 max-w-md text-sm leading-7 ${premium && theme === "light" ? "text-slate-600" : "text-white/55"}`}>
              Discover verified apartments, villas and unique homes. Book by hour, night,
              day, week or month with transparent pricing, rewards and member benefits.
            </p>

            {!compact && (
              <div className="mt-6 flex flex-wrap gap-2">
                {["Verified listings", "Secure payments", "24/7 discovery", "Premium rewards"].map((item) => (
                  <span key={item} className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${premium && theme === "light" ? "border-amber-300/60 bg-white/65 text-amber-900" : "border-white/10 bg-white/5 text-white/65"}`}>
                    ✓ {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-7 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${premium && theme === "light" ? "text-amber-700" : "text-rose-300"}`}>{group.title}</h3>
                <div className="mt-4 space-y-3">
                  {group.links.map(([label, to]) => (
                    <Link key={`${group.title}-${label}`} to={to} className={`block text-sm font-semibold transition hover:translate-x-1 ${premium && theme === "light" ? "text-slate-600 hover:text-amber-800" : "text-white/55 hover:text-white"}`}>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`mt-9 flex flex-col gap-3 border-t pt-5 text-xs font-semibold sm:flex-row sm:items-center sm:justify-between ${premium && theme === "light" ? "border-amber-300/50 text-slate-500" : "border-white/10 text-white/40"}`}>
          <p>© 2026 hydewest. All rights reserved.</p>
          <p>Built for guests, hosts and smarter stays.</p>
        </div>
      </div>
    </footer>
  );
}