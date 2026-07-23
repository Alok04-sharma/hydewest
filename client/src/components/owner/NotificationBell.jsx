import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiBell } from "react-icons/fi";
import notificationService from "../../services/notification.service";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadCount = async () => {
      try {
        const response = await notificationService.getUnreadCount();
        if (mounted && response.success) {
          setUnreadCount(Number(response.data?.unreadCount || 0));
        }
      } catch {
        // Bell should not break the navbar when the count request fails.
      }
    };

    loadCount();
    const timer = window.setInterval(loadCount, 60000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <Link
      to="/owner/notifications"
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-100 bg-purple-50 text-purple-700 transition hover:bg-purple-100"
      aria-label={`${unreadCount} unread notifications`}
      title="Notifications"
    >
      <FiBell className="text-lg" />

      {unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
