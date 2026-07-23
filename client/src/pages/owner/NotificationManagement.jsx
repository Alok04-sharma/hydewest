import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiHome,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";
import notificationService from "../../services/notification.service";

const TYPE_LABELS = {
  host_subscription_payment_received: "Payment Received",
  host_subscription_payment_pending: "Payment Pending",
  new_listing_pending_approval: "Listing Pending",
  listing_suspended: "Listing Suspended",
  subscription_expired: "Subscription Expired",
};

const typeIcon = (type) => {
  if (type.includes("subscription_payment")) return FiCreditCard;
  if (type.includes("listing")) return FiHome;
  if (type === "subscription_expired") return FiClock;
  return FiBell;
};

const formatDate = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function NotificationManagement() {
  const [result, setResult] = useState({ notifications: [], unreadCount: 0, pagination: { page: 1, totalPages: 1 } });
  const [type, setType] = useState("all");
  const [readStatus, setReadStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await notificationService.getNotifications({
        page,
        limit: 15,
        type,
        readStatus,
      });
      setResult(response.data || { notifications: [], unreadCount: 0, pagination: { page: 1, totalPages: 1 } });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Notifications load nahi ho sake.");
    } finally {
      setLoading(false);
    }
  }, [page, readStatus, type]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (notification) => {
    if (!notification.isRead) {
      await notificationService.markRead(notification._id);
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    } else {
      load();
    }
  };

  const markAll = async () => {
    await notificationService.markAllRead();
    load();
  };

  const removeNotification = async (notificationId) => {
    await notificationService.remove(notificationId);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-purple-700">
              <FiBell /> Super Admin Alerts
            </div>
            <h1 className="mt-3 text-3xl font-black text-gray-900 sm:text-4xl">Notification Management</h1>
            <p className="mt-2 text-sm text-gray-500">Subscription aur listing related important platform notifications.</p>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={markAll} className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-bold text-purple-700">
              <FiCheckCircle /> Mark all read
            </button>
            <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white">
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </header>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

        <section className="mt-6 flex flex-col justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <p className="font-black text-gray-900">{result.unreadCount || 0} unread notification(s)</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold">
              <option value="all">All Types</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={readStatus} onChange={(event) => { setReadStatus(event.target.value); setPage(1); }} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold">
              <option value="all">All Notifications</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-72 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" /></div>
          ) : result.notifications.length ? (
            <div className="divide-y divide-gray-100">
              {result.notifications.map((notification) => {
                const Icon = typeIcon(notification.type);
                return (
                  <article key={notification._id} className={`flex gap-4 p-5 transition ${notification.isRead ? "bg-white" : "bg-purple-50/60"}`}>
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${notification.isRead ? "bg-gray-100 text-gray-600" : "bg-purple-100 text-purple-700"}`}><Icon /></div>
                    <button type="button" onClick={() => markRead(notification)} className="min-w-0 flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-black text-gray-900">{notification.title}</h2>
                        {!notification.isRead && <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-black text-white">NEW</span>}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{notification.message}</p>
                      <p className="mt-2 text-xs font-semibold text-gray-400">{formatDate(notification.createdAt)}</p>
                    </button>
                    <div className="flex shrink-0 items-start gap-1">
                      {!notification.isRead && <button type="button" onClick={() => notificationService.markRead(notification._id).then(load)} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" title="Mark read"><FiCheck /></button>}
                      <button type="button" onClick={() => removeNotification(notification._id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Remove"><FiTrash2 /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center text-gray-500"><FiBell className="mx-auto text-4xl" /><p className="mt-3 font-bold">No notifications found.</p></div>
          )}

          {!loading && result.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between border-t bg-gray-50 px-5 py-4">
              <p className="text-xs font-semibold text-gray-500">Page {result.pagination.page} of {result.pagination.totalPages}</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="rounded-lg border bg-white px-4 py-2 text-xs font-bold disabled:opacity-40">Previous</button>
                <button disabled={page >= result.pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border bg-white px-4 py-2 text-xs font-bold disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}