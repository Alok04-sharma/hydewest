import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import GuestPageHeader from "../../components/guest/GuestPageHeader";
import notificationService from "../../services/notification.service";

const formatDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const notificationIcons = {
  booking_confirmed: "✅",
  payment_successful: "💳",
  checkin_reminder: "🧳",
  checkout_reminder: "⏰",
  booking_completed: "⭐",
  booking_cancelled: "❌",
  new_chat_message: "💬",
  price_drop_alert: "📉",
  loyalty_points_credited: "🎁",
  loyalty_points_redeemed: "💸",
  guest_membership_payment_pending: "💳",
  guest_membership_activated: "👑",
  guest_membership_expired: "⌛",
  subscription_payment_reminder: "⏳",
};

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const unreadCount = useMemo(
    () => items.filter((item) => !item.isRead).length,
    [items]
  );

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await notificationService.getNotifications({
        limit: 100,
      });
      const notifications =
        response?.data?.notifications || response?.data || [];

      setItems(Array.isArray(notifications) ? notifications : []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Notifications could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const openNotification = async (item) => {
    try {
      if (!item.isRead) {
        await notificationService.markRead(item._id);
        setItems((current) =>
          current.map((value) =>
            value._id === item._id ? { ...value, isRead: true } : value
          )
        );
      }
    } finally {
      if (item.actionUrl) {
        navigate(item.actionUrl);
      }
    }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Notifications could not be marked as read."
      );
    }
  };

  const removeNotification = async (id) => {
    try {
      await notificationService.remove(id);
      setItems((current) => current.filter((item) => item._id !== id));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "The notification could not be removed."
      );
    }
  };

  return (
    <div className="min-h-screen bg-transparent px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <GuestPageHeader
          eyebrow="Notifications"
          title="Your hydewest updates"
          description="Bookings, payments, reminders, loyalty rewards, chat and Premium activity in one place."
          action={
            unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#FF385C]"
              >
                Mark all read
              </button>
            ) : null
          }
        />

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid min-h-72 place-items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {items.map((item, index) => (
              <motion.article
                key={item._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.025 }}
                className={`flex gap-4 rounded-[24px] border p-4 shadow-sm ${
                  item.isRead
                    ? "border-slate-200 bg-white"
                    : "border-rose-200 bg-rose-50/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => openNotification(item)}
                  className="flex min-w-0 flex-1 gap-4 text-left"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-sm">
                    {notificationIcons[item.type] || "🔔"}
                  </span>

                  <span className="min-w-0">
                    <span className="block font-black text-slate-900">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-slate-500">
                      {item.message}
                    </span>
                    <span className="mt-2 block text-[10px] font-bold text-slate-400">
                      {formatDate(item.createdAt)}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => removeNotification(item._id)}
                  className="h-9 w-9 shrink-0 rounded-xl bg-white text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove notification"
                >
                  ×
                </button>
              </motion.article>
            ))}

            {items.length === 0 && (
              <div className="rounded-[30px] border border-dashed border-slate-300 bg-white py-20 text-center">
                <div className="text-5xl">🔔</div>
                <h2 className="mt-4 text-lg font-black text-slate-900">
                  No notifications yet
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Booking and Premium activity will appear here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
