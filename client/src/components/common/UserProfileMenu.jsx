import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiChevronDown, FiLogOut, FiSettings, FiShield, FiUser } from "react-icons/fi";
import { Link } from "react-router-dom";

export default function UserProfileMenu({ user, roleLabel, tone = "host", onLogout }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const avatarUrl = typeof user?.avatar === "string" ? user.avatar : user?.avatar?.url || "";
  const initial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U";
  const isAdmin = tone === "admin";

  useEffect(() => {
    const handleOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 pr-2.5 shadow-sm transition hover:border-slate-300 hover:shadow-lg"
        aria-expanded={open}
      >
        <span className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl text-sm font-black text-white ${isAdmin ? "bg-gradient-to-br from-violet-700 to-fuchsia-500" : "bg-gradient-to-br from-[#FF385C] to-orange-400"}`}>
          {avatarUrl ? <img src={avatarUrl} alt={user?.name || "Profile"} className="h-full w-full object-cover" /> : initial}
          <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
        </span>
        <span className="hidden min-w-0 text-left lg:block">
          <span className="block max-w-28 truncate text-xs font-black text-slate-900">
            {user?.name || "StayNest User"}
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {roleLabel}
          </span>
        </span>
        <FiChevronDown className="hidden text-slate-400 lg:block" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="absolute right-0 top-[calc(100%+12px)] z-[90] w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-[28px] border border-white/60 bg-white/95 p-2 shadow-[0_24px_90px_rgba(15,23,42,0.22)] backdrop-blur-xl"
          >
            <div className={`relative overflow-hidden rounded-3xl p-5 text-white ${isAdmin ? "bg-gradient-to-br from-violet-900 via-purple-800 to-fuchsia-600" : "bg-gradient-to-br from-slate-950 via-rose-950 to-[#FF385C]"}`}>
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
              <div className="absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-white/5" />
              <div className="relative flex items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-lg font-black">
                  {avatarUrl ? <img src={avatarUrl} alt={user?.name || "Profile"} className="h-full w-full object-cover" /> : initial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black">{user?.name || "StayNest User"}</p>
                  <p className="mt-1 truncate text-xs text-white/65">{user?.email || "Account email"}</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                    <FiShield /> {roleLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2 grid gap-1">
              <Link onClick={() => setOpen(false)} to="/profile" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100">
                <FiUser className={isAdmin ? "text-violet-600" : "text-[#FF385C]"} />
                View profile
              </Link>
              <Link onClick={() => setOpen(false)} to="/profile" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100">
                <FiSettings className={isAdmin ? "text-violet-600" : "text-[#FF385C]"} />
                Account settings
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black text-red-600 transition hover:bg-red-50"
              >
                <FiLogOut /> Logout securely
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}