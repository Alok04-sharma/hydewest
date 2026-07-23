import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FiBell } from "react-icons/fi";
import notificationService from "../../services/notification.service";

const TONE_STYLES = {
  admin: "border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100",
  host: "border-rose-200 bg-rose-50 text-[#FF385C] hover:border-rose-300 hover:bg-rose-100",
  default: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
};

export default function NotificationBell({
  to,
  tone = "default",
  pollInterval = 60000,
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadCount = useCallback(async () => {
    try {
      const response = await notificationService.getUnreadCount();
      if (response.success) {
        setUnreadCount(Number(response.data?.unreadCount || 0));
      }
    } catch {
      // Notification failure must never break the navigation bar.
    }
  }, []);

  useEffect(() => {
    loadCount();
    const timer = window.setInterval(loadCount, pollInterval);
    const refresh = () => loadCount();

    window.addEventListener("focus", refresh);
    window.addEventListener("notifications:refresh", refresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("notifications:refresh", refresh);
    };
  }, [loadCount, pollInterval]);

  return (
    <motion.div whileHover={{ y: -2, rotate: -3 }} whileTap={{ scale: 0.94 }}>
      <Link
        to={to}
        className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition hover:shadow-lg ${
          TONE_STYLES[tone] || TONE_STYLES.default
        }`}
        aria-label={`${unreadCount} unread notifications`}
        title="Notifications"
      >
        <FiBell className="text-lg" />

        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-md ring-2 ring-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </Link>
    </motion.div>
  );
}