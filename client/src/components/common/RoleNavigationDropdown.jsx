import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiChevronDown, FiGrid, FiX } from "react-icons/fi";
import { NavLink, useLocation } from "react-router-dom";

const dropdownVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 360, damping: 28 },
  },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.16 } },
};

export default function RoleNavigationDropdown({
  label,
  links,
  tone = "admin",
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const location = useLocation();

  const isAdmin = tone === "admin";
  const activeItem = links.find((item) => location.pathname.startsWith(item.to));

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const triggerClass = isAdmin
    ? "border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-800 hover:border-violet-300 hover:shadow-violet-200/60"
    : "border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50 text-rose-700 hover:border-rose-300 hover:shadow-rose-200/60";

  return (
    <div ref={wrapperRef} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm font-black shadow-sm transition hover:shadow-lg ${triggerClass} ${
          compact ? "min-w-0" : "min-w-[52px] sm:min-w-[190px]"
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm ${isAdmin ? "bg-violet-700" : "bg-[#FF385C]"}`}>
            <FiGrid />
          </span>
          {!compact && (
            <span className="hidden min-w-0 sm:block">
              <span className="block text-[10px] font-black uppercase tracking-[0.18em] opacity-55">
                {label}
              </span>
              <span className="block truncate text-sm">
                {activeItem?.label || "Open navigation"}
              </span>
            </span>
          )}
        </span>

        {open ? <FiX className="shrink-0" /> : <FiChevronDown className="shrink-0" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="menu"
            className="absolute right-0 top-[calc(100%+12px)] z-[80] w-[min(330px,calc(100vw-24px))] overflow-hidden rounded-[26px] border border-white/70 bg-white/95 p-2 shadow-[0_24px_80px_rgba(15,23,42,0.2)] backdrop-blur-xl"
          >
            <div className={`mb-2 rounded-2xl px-4 py-3 text-white ${isAdmin ? "bg-gradient-to-br from-violet-800 via-purple-700 to-fuchsia-600" : "bg-gradient-to-br from-slate-950 via-rose-950 to-[#FF385C]"}`}>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/65">
                Quick navigation
              </p>
              <p className="mt-1 text-base font-black">{label}</p>
              <p className="mt-1 text-xs leading-5 text-white/65">
                Manage your workspace from one clean menu.
              </p>
            </div>

            <div className="grid gap-1">
              {links.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.to}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.035 }}
                  >
                    <NavLink
                      to={item.to}
                      role="menuitem"
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
                          isActive
                            ? isAdmin
                              ? "bg-violet-100 text-violet-800"
                              : "bg-rose-100 text-rose-700"
                            : "text-slate-700 hover:bg-slate-100"
                        }`
                      }
                    >
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg transition group-hover:scale-105 ${isAdmin ? "bg-violet-50 text-violet-700" : "bg-rose-50 text-[#FF385C]"}`}>
                        <Icon />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-400">
                          {item.description}
                        </span>
                      </span>
                      <span className="text-slate-300 transition group-hover:translate-x-0.5">→</span>
                    </NavLink>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}